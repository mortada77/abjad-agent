import { config } from '../config.js';
import { logger } from '../logger.js';
import { store, type ChatTurn } from '../db/index.js';
import type { AIProvider } from '../ai/index.js';

/**
 * Builds a bounded context for the model:
 *   - a running summary of older messages (if the conversation is long)
 *   - the last N raw turns
 * This keeps token usage (and cost) predictable regardless of history length.
 */
export function buildContext(jid: string): { systemSuffix: string; history: ChatTurn[] } {
  const history = store.recentMessages(jid, config.memory.maxHistoryMessages);
  const { summary } = store.getConversationState(jid);
  const systemSuffix = summary
    ? `\n\n## ملخص المحادثة السابقة مع هذا العميل\n${summary}`
    : '';
  return { systemSuffix, history };
}

/**
 * If the stored history has grown past the trigger, fold the older half into
 * the running summary. Best-effort: any failure is logged and swallowed so it
 * never blocks a reply.
 */
export async function maybeSummarize(jid: string, provider: AIProvider): Promise<void> {
  try {
    const total = store.countMessages(jid);
    if (total < config.memory.summaryTriggerMessages) return;
    if (!provider.isReady()) return;

    // Take everything except the most recent `maxHistoryMessages` and summarise it.
    const keep = config.memory.maxHistoryMessages;
    const olderCount = total - keep;
    if (olderCount <= 0) return;

    const older = store.raw
      .prepare(
        `SELECT id, role, content FROM messages WHERE jid = ? ORDER BY id ASC LIMIT ?`,
      )
      .all(jid, olderCount) as { id: number; role: string; content: string }[];

    const { summary, summarized_upto } = store.getConversationState(jid);
    const fresh = older.filter((m) => m.id > summarized_upto);
    if (fresh.length === 0) return;

    const transcript = fresh.map((m) => `${m.role === 'user' ? 'العميل' : 'الوكيل'}: ${m.content}`).join('\n');
    const summarizeSystem =
      'لخّص المحادثة التالية بين عميل ووكيل مبيعات لشركة أبجد بشكل موجز جداً بالعربية. ' +
      'ركّز على: نوع نشاط العميل، عدد الفروع، النظام الحالي، احتياجاته، وأي وعود أو نقاط مهمة. ' +
      (summary ? `\n\nالملخص الحالي (وسّعه، لا تكرره):\n${summary}` : '');

    const newSummary = await provider.summarize(summarizeSystem, transcript);
    if (newSummary) {
      const lastId = fresh[fresh.length - 1].id;
      store.setConversationSummary(jid, newSummary, lastId);
      logger.info('[MEMORY] Updated summary for %s (folded %d messages)', jid, fresh.length);
    }
  } catch (err) {
    logger.warn('[MEMORY] Summarize failed for %s: %s', jid, (err as Error).message);
  }
}
