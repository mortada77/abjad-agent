import { config } from '../config.js';
import { logger } from '../logger.js';
import { store } from '../db/index.js';
import { getSystemPrompt, activeProvider } from '../ai/index.js';
import { buildContext, maybeSummarize } from '../memory/conversation.js';
import { isAiActive, pause } from '../takeover/takeover.js';
import { parseEscalation } from '../escalation.js';
import { retry, withTimeout, Semaphore } from '../util.js';
import { toJid } from '../control.js';
import { getWebsiteContext } from '../ai/website-context.js';

export type SendReply = (jid: string, text: string) => Promise<void>;

interface PendingState {
  buffer: string[]; // messages that arrived during the debounce window
  timer: NodeJS.Timeout | null;
  processing: boolean;
}

const BROKEN_FALLBACK_RE = /ما وصلني رد واضح|جر[ّ ]?ب صياغة ثانية/i;

/** Keep WhatsApp replies crisp without cutting a sentence in the middle. */
function polishCustomerReply(value: string): string {
  const text = value
    .trim()
    // WhatsApp should receive clean employee-style copy, never raw Markdown.
    .replace(/\*/g, '')
    .replace(/^\s{0,3}#{1,6}\s*/gm, '')
    .replace(/`+/g, '')
    .replace(/\n{3,}/g, '\n\n');
  if (text.length <= 650) return text;
  const clipped = text.slice(0, 650);
  const boundary = Math.max(clipped.lastIndexOf('.'), clipped.lastIndexOf('؟'), clipped.lastIndexOf('!'));
  return (boundary > 240 ? clipped.slice(0, boundary + 1) : clipped).trim();
}

/**
 * Per-contact message pipeline:
 *   - debounce: collect rapid messages, answer them together
 *   - one in-flight reply per contact (no double replies)
 *   - global concurrency limit across all contacts
 *   - retry + timeout around the AI call
 */
export class MessageProcessor {
  private pending = new Map<string, PendingState>();
  private globalLimiter = new Semaphore(config.ai.maxConcurrency);

  constructor(private readonly send: SendReply) {}

  /** Queue an incoming user message for a contact (applies debounce). */
  enqueue(jid: string, text: string): void {
    let st = this.pending.get(jid);
    if (!st) {
      st = { buffer: [], timer: null, processing: false };
      this.pending.set(jid, st);
    }
    st.buffer.push(text);
    if (st.timer) clearTimeout(st.timer);
    st.timer = setTimeout(() => void this.flush(jid), config.whatsapp.debounceMs);
  }

  private async flush(jid: string): Promise<void> {
    const st = this.pending.get(jid);
    if (!st) return;
    if (st.processing) {
      // Something is already running for this contact; retrigger shortly.
      st.timer = setTimeout(() => void this.flush(jid), config.whatsapp.debounceMs);
      return;
    }
    if (st.buffer.length === 0) return;

    const incomingCount = st.buffer.length;
    const combined = st.buffer.join('\n').trim();
    st.buffer = [];
    st.timer = null;
    st.processing = true;

    try {
      // Re-check takeover right before replying — operator may have jumped in.
      if (!isAiActive(jid)) {
        logger.info('[AI] Skipping reply for %s (human mode active)', jid);
        return;
      }
      const provider = activeProvider();
      if (!provider.isReady()) {
        logger.error(
          '[AI] Cannot reply to %s: provider "%s" not ready (%s)',
          jid,
          provider.name,
          provider.notReadyReason(),
        );
        return;
      }

      const reply = await this.generate(jid, combined, incomingCount);
      if (!reply) {
        logger.warn('[AI] Empty reply for %s', jid);
        return;
      }

      const esc = parseEscalation(reply);
      const customerText = esc
        ? esc.cleanReply ||
          'شكراً إلك 🙏 راح أتواصل مع الإدارة بخصوص طلبك وأرجعلك بأقرب وقت.'
        : reply;

      await this.send(jid, customerText);
      store.addMessage(jid, 'assistant', customerText);
      logger.info('[WHATSAPP] reply sent to %s', jid);

      if (esc) {
        await this.handleEscalation(jid, esc.reason, combined);
      }

      // Fold older history into a summary if it has grown (best-effort).
      void maybeSummarize(jid);
    } catch (err) {
      logger.error('[AI] Failed to handle message for %s: %s', jid, (err as Error).message);
    } finally {
      st.processing = false;
      // If more messages arrived while we were busy, process them next.
      if (st.buffer.length > 0) {
        st.timer = setTimeout(() => void this.flush(jid), config.whatsapp.debounceMs);
      }
    }
  }

  /** A management decision is needed: record it (surfaced in the dashboard) + pause AI. */
  private async handleEscalation(jid: string, reason: string, lastMsg: string): Promise<void> {
    const contact = store.getContact(jid);
    const name = contact?.display_name ?? null;
    const phone = contact?.phone ?? null;

    const id = store.addEscalation({ jid, name, phone, reason, lastMsg });
    logger.warn('[ESCALATE] #%d %s (%s): %s', id, name ?? phone ?? jid, phone ?? '', reason);

    // Pause AI for this contact so a human can take over from the dashboard.
    pause(jid);

    if (config.admin.number) {
      const who = name || phone || jid.split('@')[0];
      const notice =
        `🔔 قرار إدارة مطلوب — #${id}\n` +
        `العميل: ${who}\n` +
        `السبب: ${reason}\n` +
        `آخر رسالة: ${lastMsg}\n\n` +
        `جاوب بهذا الشكل:\nرد ${id}: قرارك هنا`;
      try {
        await this.send(toJid(config.admin.number), notice);
      } catch (err) {
        logger.error('[ESCALATE] Failed to notify admin for #%d: %s', id, (err as Error).message);
      }
    } else {
      logger.warn('[ESCALATE] ADMIN_NUMBER is not configured; #%d is dashboard-only', id);
    }
  }

  private async generate(jid: string, userText: string, incomingCount: number): Promise<string> {
    const { systemSuffix, history } = buildContext(jid);
    // Incoming messages are already persisted before enqueue(). Remove them
    // from prior history so the model sees each customer message exactly once.
    let trimCount = 0;
    for (let i = history.length - 1; i >= 0 && trimCount < incomingCount; i--) {
      if (history[i].role !== 'user') break;
      trimCount++;
    }
    const priorHistory = trimCount ? history.slice(0, -trimCount) : history;
    const websiteContext = await getWebsiteContext();
    const system = getSystemPrompt() + websiteContext + systemSuffix;

    const release = await this.globalLimiter.acquire();
    try {
      logger.info('[AI] request started for %s', jid);
      let reply = await retry(
        () =>
          withTimeout(
            activeProvider().generateReply({ system, history: priorHistory, user: userText }),
            config.ai.timeoutMs,
            'AI request',
          ),
        {
          retries: config.ai.maxRetries,
          onRetry: (attempt, err) =>
            logger.warn('[AI] retry %d for %s: %s', attempt, jid, err.message),
        },
      );
      const previousAssistant = [...priorHistory].reverse().find((turn) => turn.role === 'assistant')?.content.trim();
      const unusable = !reply.trim() || BROKEN_FALLBACK_RE.test(reply);
      const repeated = Boolean(previousAssistant && reply.trim() === previousAssistant);
      if (unusable || repeated) {
        logger.warn('[AI] Regenerating %s reply for %s', unusable ? 'empty/fallback' : 'duplicate', jid);
        reply = await withTimeout(
          activeProvider().generateReply({
            system:
              system +
              '\n\n## تصحيح إلزامي لهذه الإجابة\nأجب الآن بجواب عراقي جديد ومباشر من جملة إلى ثلاث جمل. افهم المقصود من السياق، ولا تكرر أي جواب سابق ولا تطلب إعادة الصياغة.',
            history: priorHistory,
            user: userText,
          }),
          config.ai.timeoutMs,
          'AI recovery request',
        );
      }
      logger.info('[AI] response completed for %s', jid);
      return polishCustomerReply(reply);
    } finally {
      release();
    }
  }
}
