import { logger } from '../logger.js';
import { store, type ChatTurn } from '../db/index.js';
import { activeProvider } from '../ai/index.js';

const KEEP_RECENT = 24; // messages sent verbatim
const SUMMARY_TRIGGER = 40; // summarise once history passes this

/** Build the executive context: running summary + recent turns. */
export function buildExecutiveContext(session = 'default'): {
  summarySuffix: string;
  history: ChatTurn[];
} {
  const history = store.execRecent(KEEP_RECENT, session);
  const { summary } = store.execGetState(session);
  const summarySuffix = summary
    ? `\n\n## ملخّص محادثاتنا السابقة (سياق دائم)\n${summary}`
    : '';
  return { summarySuffix, history };
}

/** Fold older executive messages into a persistent summary (best-effort). */
export async function maybeSummarizeExecutive(session = 'default'): Promise<void> {
  try {
    const total = store.execCount(session);
    if (total < SUMMARY_TRIGGER) return;
    const provider = activeProvider();
    if (!provider.isReady()) return;

    const older = store.execOlder(KEEP_RECENT, session);
    const { summary, summarized_upto } = store.execGetState(session);
    const fresh = older.filter((m) => m.id > summarized_upto);
    if (fresh.length === 0) return;

    const transcript = fresh
      .map((m) => `${m.role === 'user' ? 'المالك' : 'المساعد'}: ${m.content}`)
      .join('\n');
    const sys =
      'لخّص المحادثة التالية بين المالك ومساعده التنفيذي بإيجاز شديد بالعربية. ' +
      'احتفظ بـ: القرارات المهمة، المشاريع الجارية، المهام، العملاء قيد المتابعة، ' +
      'المشاكل المفتوحة، الأفكار، وأي شيء طُلب متابعته، وآخر حالة لكل موضوع.' +
      (summary ? `\n\nالملخص الحالي (وسّعه لا تكرره):\n${summary}` : '');

    const next = await provider.summarize(sys, transcript);
    if (next) {
      const lastId = fresh[fresh.length - 1].id;
      store.execSetSummary(next, lastId, session);
      logger.info('[EXEC] summary updated (folded %d msgs)', fresh.length);
    }
  } catch (err) {
    logger.warn('[EXEC] summarize failed: %s', (err as Error).message);
  }
}
