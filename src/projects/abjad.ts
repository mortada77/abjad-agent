import { store } from '../db/index.js';
import { runtime } from '../runtime.js';

/**
 * Abjad project data adapter. Read-only functions the Executive AI calls via
 * tools. No raw SQL/shell is ever exposed to the model — only these accessors.
 */

export function getSummary() {
  const k = store.kpis();
  const pipe = store.pipeline();
  const a = store.analytics();
  return {
    today: {
      conversations: k.conversations,
      newCustomers: k.newCustomers,
      opportunities: k.opportunities,
      needsHuman: k.needsYou,
    },
    pipeline: pipe,
    totals: { customers: a.totalContacts, messages: a.totalMessages, solvedByAi: a.solvedByAi },
    whatsapp: runtime.whatsapp,
    aiReady: runtime.aiReady,
  };
}

export function getHotLeads(limit = 10) {
  return store
    .listContacts(300)
    .filter(
      (c) =>
        (c.interest_pct ?? 0) >= 60 ||
        ['interested', 'trial', 'negotiation'].includes(c.stage),
    )
    .sort((a, b) => (b.interest_pct ?? 0) - (a.interest_pct ?? 0))
    .slice(0, limit)
    .map((c) => ({
      name: c.display_name || c.phone,
      phone: c.phone,
      stage: c.stage,
      interest: c.interest_pct ?? 0,
      lastMessage: c.last_message,
    }));
}

export function getNewCustomers() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  return store
    .listContacts(300)
    .filter((c) => c.last_seen >= start.getTime())
    .map((c) => ({ name: c.display_name || c.phone, phone: c.phone, stage: c.stage }));
}

export function searchCustomers(query: string) {
  const q = (query || '').toLowerCase();
  return store
    .listContacts(300)
    .filter(
      (c) =>
        (c.display_name || '').toLowerCase().includes(q) ||
        (c.phone || '').includes(q),
    )
    .slice(0, 20)
    .map((c) => ({ name: c.display_name || c.phone, phone: c.phone, jid: c.jid, stage: c.stage, interest: c.interest_pct ?? 0 }));
}

export function getCustomer(query: string) {
  const q = (query || '').toLowerCase();
  const c = store
    .listContacts(300)
    .find(
      (x) =>
        (x.display_name || '').toLowerCase().includes(q) || (x.phone || '').includes(q),
    );
  if (!c) return { found: false, query };
  const convo = store.conversation(c.jid, 30).map((m) => ({ role: m.role, content: m.content }));
  let insight: any = null;
  try {
    const raw = store.getInsight(c.jid).insight;
    insight = raw ? JSON.parse(raw) : null;
  } catch {
    insight = null;
  }
  return {
    found: true,
    name: c.display_name || c.phone,
    phone: c.phone,
    stage: c.stage,
    interest: c.interest_pct ?? 0,
    state: c.state,
    insight,
    conversation: convo,
  };
}

export function getPendingHuman() {
  return store.listUnhandledEscalations(20).map((e) => ({
    id: e.id,
    name: e.name || e.phone,
    phone: e.phone,
    reason: e.reason,
    lastMessage: e.last_msg,
  }));
}

export function getSalesPipeline() {
  return store.pipeline();
}

export function getMarketingPerformance() {
  const a = store.analytics();
  const k = store.kpis();
  return {
    conversationsToday: k.conversations,
    newCustomersToday: k.newCustomers,
    totalCustomers: a.totalContacts,
    totalMessages: a.totalMessages,
    solvedByAiAlone: a.solvedByAi,
    escalated: a.escalatedContacts,
  };
}

export function getRecentCustomers(limit = 15) {
  return store
    .listContacts(limit)
    .map((c) => ({ name: c.display_name || c.phone, phone: c.phone, stage: c.stage, interest: c.interest_pct ?? 0, lastMessage: c.last_message }));
}
