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
`);

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
};

export type Store = typeof store;
