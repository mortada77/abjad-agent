import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { config } from '../config.js';
import { logger } from '../logger.js';

export type ContactState = 'AI_ACTIVE' | 'HUMAN_MODE';

export interface ChatTurn {
  role: 'user' | 'assistant';
  content: string;
}

// Ensure the data directory exists.
fs.mkdirSync(path.dirname(config.paths.db), { recursive: true });

const db = new Database(config.paths.db);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS contacts (
    jid           TEXT PRIMARY KEY,
    phone         TEXT,
    display_name  TEXT,
    ai_enabled    INTEGER NOT NULL DEFAULT 1,
    state         TEXT    NOT NULL DEFAULT 'AI_ACTIVE',
    human_until   INTEGER,                 -- epoch ms; AI stays paused until then
    notes         TEXT,
    first_seen    INTEGER NOT NULL,
    last_seen     INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS messages (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    jid        TEXT NOT NULL,
    role       TEXT NOT NULL,             -- 'user' | 'assistant'
    content    TEXT NOT NULL,
    wa_msg_id  TEXT,
    created_at INTEGER NOT NULL,
    FOREIGN KEY (jid) REFERENCES contacts(jid) ON DELETE CASCADE
  );
  CREATE INDEX IF NOT EXISTS idx_messages_jid ON messages(jid, id);

  CREATE TABLE IF NOT EXISTS processed_messages (
    wa_msg_id  TEXT PRIMARY KEY,
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS conversation_state (
    jid            TEXT PRIMARY KEY,
    summary        TEXT,
    summarized_upto INTEGER NOT NULL DEFAULT 0,  -- last message id folded into summary
    updated_at     INTEGER NOT NULL,
    FOREIGN KEY (jid) REFERENCES contacts(jid) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS settings (
    key   TEXT PRIMARY KEY,
    value TEXT
  );

  CREATE TABLE IF NOT EXISTS escalations (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    jid        TEXT NOT NULL,
    name       TEXT,
    phone      TEXT,
    reason     TEXT,
    last_msg   TEXT,
    handled    INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_escalations_created ON escalations(created_at DESC);
`);

// --- Lightweight migrations: add CRM columns to contacts if missing ---
function ensureColumn(table: string, col: string, def: string) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
  if (!cols.some((c) => c.name === col)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${col} ${def}`);
  }
}
ensureColumn('contacts', 'stage', "TEXT NOT NULL DEFAULT 'new'"); // new|interested|trial|negotiation|subscribed|lost
ensureColumn('contacts', 'interest_pct', 'INTEGER');
ensureColumn('contacts', 'insight', 'TEXT'); // cached AI insight JSON
ensureColumn('contacts', 'insight_at', 'INTEGER');
ensureColumn('contacts', 'followup_at', 'INTEGER');
ensureColumn('contacts', 'followup_note', 'TEXT');
ensureColumn('contacts', 'last_message', 'TEXT'); // preview of last message

logger.info('[DB] SQLite ready at %s', config.paths.db);

// ---- Prepared statements ----
const stmtUpsertContact = db.prepare(`
  INSERT INTO contacts (jid, phone, display_name, first_seen, last_seen)
  VALUES (@jid, @phone, @display_name, @now, @now)
  ON CONFLICT(jid) DO UPDATE SET
    last_seen = @now,
    phone = COALESCE(excluded.phone, contacts.phone),
    display_name = COALESCE(excluded.display_name, contacts.display_name)
`);
const stmtGetContact = db.prepare(`SELECT * FROM contacts WHERE jid = ?`);
const stmtSetState = db.prepare(
  `UPDATE contacts SET state = @state, human_until = @until WHERE jid = @jid`,
);
const stmtInsertMessage = db.prepare(`
  INSERT INTO messages (jid, role, content, wa_msg_id, created_at)
  VALUES (@jid, @role, @content, @wa_msg_id, @now)
`);
const stmtRecentMessages = db.prepare(`
  SELECT id, role, content FROM messages
  WHERE jid = ? ORDER BY id DESC LIMIT ?
`);
const stmtCountMessages = db.prepare(`SELECT COUNT(*) AS c FROM messages WHERE jid = ?`);
const stmtMarkProcessed = db.prepare(`
  INSERT OR IGNORE INTO processed_messages (wa_msg_id, created_at) VALUES (?, ?)
`);
const stmtIsProcessed = db.prepare(`SELECT 1 FROM processed_messages WHERE wa_msg_id = ?`);
const stmtGetConvState = db.prepare(`SELECT * FROM conversation_state WHERE jid = ?`);
const stmtUpsertConvState = db.prepare(`
  INSERT INTO conversation_state (jid, summary, summarized_upto, updated_at)
  VALUES (@jid, @summary, @summarized_upto, @now)
  ON CONFLICT(jid) DO UPDATE SET
    summary = @summary, summarized_upto = @summarized_upto, updated_at = @now
`);
const stmtListContacts = db.prepare(`
  SELECT jid, phone, display_name, state, human_until, last_seen,
         stage, interest_pct, last_message, followup_at
  FROM contacts ORDER BY last_seen DESC LIMIT ?
`);
const stmtConversation = db.prepare(`
  SELECT role, content, created_at FROM messages
  WHERE jid = ? ORDER BY id DESC LIMIT ?
`);
const stmtGetSetting = db.prepare(`SELECT value FROM settings WHERE key = ?`);
const stmtSetSetting = db.prepare(`
  INSERT INTO settings (key, value) VALUES (?, ?)
  ON CONFLICT(key) DO UPDATE SET value = excluded.value
`);
const stmtAddEscalation = db.prepare(`
  INSERT INTO escalations (jid, name, phone, reason, last_msg, created_at)
  VALUES (@jid, @name, @phone, @reason, @last_msg, @now)
`);
const stmtListEscalations = db.prepare(`
  SELECT id, jid, name, phone, reason, last_msg, handled, created_at
  FROM escalations ORDER BY id DESC LIMIT ?
`);
const stmtListUnhandled = db.prepare(`
  SELECT id, jid, name, phone, reason, last_msg, created_at
  FROM escalations WHERE handled = 0 ORDER BY id DESC LIMIT ?
`);
const stmtGetEscalation = db.prepare(`SELECT * FROM escalations WHERE id = ?`);
const stmtHandleEscalation = db.prepare(`UPDATE escalations SET handled = 1 WHERE id = ?`);
const stmtSetLastMessage = db.prepare(
  `UPDATE contacts SET last_message = @m, last_seen = @now WHERE jid = @jid`,
);
const stmtSetStage = db.prepare(`UPDATE contacts SET stage = @stage WHERE jid = @jid`);
const stmtSetInsight = db.prepare(
  `UPDATE contacts SET insight = @insight, interest_pct = @pct, stage = COALESCE(@stage, stage), insight_at = @now WHERE jid = @jid`,
);
const stmtSetFollowup = db.prepare(
  `UPDATE contacts SET followup_at = @at, followup_note = @note WHERE jid = @jid`,
);

export interface ContactRow {
  jid: string;
  phone: string | null;
  display_name: string | null;
  ai_enabled: number;
  state: ContactState;
  human_until: number | null;
  notes: string | null;
  first_seen: number;
  last_seen: number;
}

export const store = {
  raw: db,

  upsertContact(jid: string, phone: string | null, displayName: string | null) {
    stmtUpsertContact.run({
      jid,
      phone,
      display_name: displayName,
      now: Date.now(),
    });
  },

  getContact(jid: string): ContactRow | undefined {
    return stmtGetContact.get(jid) as ContactRow | undefined;
  },

  setState(jid: string, state: ContactState, humanUntil: number | null) {
    stmtSetState.run({ jid, state, until: humanUntil });
  },

  addMessage(jid: string, role: 'user' | 'assistant', content: string, waMsgId?: string) {
    stmtInsertMessage.run({
      jid,
      role,
      content,
      wa_msg_id: waMsgId ?? null,
      now: Date.now(),
    });
    const preview = (role === 'assistant' ? '🤖 ' : '') + content.slice(0, 80);
    stmtSetLastMessage.run({ jid, m: preview, now: Date.now() });
  },

  /** Recent turns in chronological order (oldest -> newest). */
  recentMessages(jid: string, limit: number): ChatTurn[] {
    const rows = stmtRecentMessages.all(jid, limit) as {
      id: number;
      role: 'user' | 'assistant';
      content: string;
    }[];
    return rows.reverse().map((r) => ({ role: r.role, content: r.content }));
  },

  countMessages(jid: string): number {
    return (stmtCountMessages.get(jid) as { c: number }).c;
  },

  isProcessed(waMsgId: string): boolean {
    return !!stmtIsProcessed.get(waMsgId);
  },

  markProcessed(waMsgId: string) {
    stmtMarkProcessed.run(waMsgId, Date.now());
  },

  getConversationState(jid: string): { summary: string; summarized_upto: number } {
    const row = stmtGetConvState.get(jid) as
      | { summary: string | null; summarized_upto: number }
      | undefined;
    return {
      summary: row?.summary ?? '',
      summarized_upto: row?.summarized_upto ?? 0,
    };
  },

  setConversationSummary(jid: string, summary: string, summarizedUpto: number) {
    stmtUpsertConvState.run({
      jid,
      summary,
      summarized_upto: summarizedUpto,
      now: Date.now(),
    });
  },

  listContacts(limit = 200) {
    return stmtListContacts.all(limit) as {
      jid: string;
      phone: string | null;
      display_name: string | null;
      state: ContactState;
      human_until: number | null;
      last_seen: number;
      stage: string;
      interest_pct: number | null;
      last_message: string | null;
      followup_at: number | null;
    }[];
  },

  setStage(jid: string, stage: string) {
    stmtSetStage.run({ jid, stage });
  },

  setInsight(jid: string, insightJson: string, pct: number | null, stage: string | null) {
    stmtSetInsight.run({ jid, insight: insightJson, pct, stage, now: Date.now() });
  },

  getInsight(jid: string): { insight: string | null; insight_at: number | null } {
    const row = stmtGetContact.get(jid) as ContactRow & { insight?: string; insight_at?: number };
    return { insight: row?.insight ?? null, insight_at: row?.insight_at ?? null };
  },

  setFollowup(jid: string, at: number | null, note: string | null) {
    stmtSetFollowup.run({ jid, at, note });
  },

  kpis() {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const t0 = startOfDay.getTime();
    const convos = (
      db
        .prepare(`SELECT COUNT(DISTINCT jid) AS c FROM messages WHERE created_at >= ?`)
        .get(t0) as { c: number }
    ).c;
    const newCustomers = (
      db.prepare(`SELECT COUNT(*) AS c FROM contacts WHERE first_seen >= ?`).get(t0) as {
        c: number;
      }
    ).c;
    const opportunities = (
      db
        .prepare(
          `SELECT COUNT(*) AS c FROM contacts WHERE stage IN ('interested','trial','negotiation')`,
        )
        .get() as { c: number }
    ).c;
    const needsYou = (
      db.prepare(`SELECT COUNT(*) AS c FROM escalations WHERE handled = 0`).get() as { c: number }
    ).c;
    return { conversations: convos, newCustomers, opportunities, needsYou };
  },

  pipeline() {
    const rows = db
      .prepare(`SELECT stage, COUNT(*) AS c FROM contacts GROUP BY stage`)
      .all() as { stage: string; c: number }[];
    const map: Record<string, number> = {
      new: 0,
      interested: 0,
      trial: 0,
      negotiation: 0,
      subscribed: 0,
      lost: 0,
    };
    for (const r of rows) if (r.stage in map) map[r.stage] = r.c;
    return map;
  },

  analytics() {
    const totalContacts = (
      db.prepare(`SELECT COUNT(*) AS c FROM contacts`).get() as { c: number }
    ).c;
    const totalMessages = (
      db.prepare(`SELECT COUNT(*) AS c FROM messages`).get() as { c: number }
    ).c;
    const totalEscalations = (
      db.prepare(`SELECT COUNT(*) AS c FROM escalations`).get() as { c: number }
    ).c;
    const escalatedContacts = (
      db.prepare(`SELECT COUNT(DISTINCT jid) AS c FROM escalations`).get() as { c: number }
    ).c;
    const solvedByAi = Math.max(totalContacts - escalatedContacts, 0);
    return { totalContacts, totalMessages, totalEscalations, escalatedContacts, solvedByAi };
  },

  conversation(jid: string, limit = 50) {
    const rows = stmtConversation.all(jid, limit) as {
      role: string;
      content: string;
      created_at: number;
    }[];
    return rows.reverse();
  },

  getSetting(key: string): string | null {
    const row = stmtGetSetting.get(key) as { value: string } | undefined;
    return row?.value ?? null;
  },

  setSetting(key: string, value: string) {
    stmtSetSetting.run(key, value);
  },

  addEscalation(e: {
    jid: string;
    name: string | null;
    phone: string | null;
    reason: string;
    lastMsg: string;
  }): number {
    const info = stmtAddEscalation.run({
      jid: e.jid,
      name: e.name,
      phone: e.phone,
      reason: e.reason,
      last_msg: e.lastMsg,
      now: Date.now(),
    });
    return Number(info.lastInsertRowid);
  },

  listUnhandledEscalations(limit = 20) {
    return stmtListUnhandled.all(limit) as {
      id: number;
      jid: string;
      name: string | null;
      phone: string | null;
      reason: string;
      last_msg: string;
      created_at: number;
    }[];
  },

  getEscalation(id: number) {
    return stmtGetEscalation.get(id) as
      | {
          id: number;
          jid: string;
          name: string | null;
          phone: string | null;
          reason: string;
          last_msg: string;
          handled: number;
          created_at: number;
        }
      | undefined;
  },

  listEscalations(limit = 50) {
    return stmtListEscalations.all(limit) as {
      id: number;
      jid: string;
      name: string | null;
      phone: string | null;
      reason: string;
      last_msg: string;
      handled: number;
      created_at: number;
    }[];
  },

  markEscalationHandled(id: number) {
    stmtHandleEscalation.run(id);
  },
};

export type Store = typeof store;
