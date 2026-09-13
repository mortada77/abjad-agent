import { config } from '../config.js';
import { logger } from '../logger.js';
import { store } from '../db/index.js';
import { getSystemPrompt, activeProvider } from '../ai/index.js';
import { buildContext, maybeSummarize } from '../memory/conversation.js';
import { isAiActive, pause } from '../takeover/takeover.js';
import { parseEscalation } from '../escalation.js';
import { retry, withTimeout, Semaphore } from '../util.js';
import { toJid } from '../control.js';

export type SendReply = (jid: string, text: string) => Promise<void>;

interface PendingState {
  buffer: string[]; // messages that arrived during the debounce window
  timer: NodeJS.Timeout | null;
  processing: boolean;
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

      const reply = await this.generate(jid, combined);
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

  private async generate(jid: string, userText: string): Promise<string> {
    const { systemSuffix, history } = buildContext(jid);
    const system = getSystemPrompt() + systemSuffix;

    const release = await this.globalLimiter.acquire();
    try {
      logger.info('[AI] request started for %s', jid);
      const reply = await retry(
        () =>
          withTimeout(
            activeProvider().generateReply({ system, history, user: userText }),
            config.ai.timeoutMs,
            'AI request',
          ),
        {
          retries: config.ai.maxRetries,
          onRetry: (attempt, err) =>
            logger.warn('[AI] retry %d for %s: %s', attempt, jid, err.message),
        },
      );
      logger.info('[AI] response completed for %s', jid);
      return reply;
    } finally {
      release();
    }
  }
}
