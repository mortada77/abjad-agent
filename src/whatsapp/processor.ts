import { config } from '../config.js';
import { logger } from '../logger.js';
import { store } from '../db/index.js';
import { getSystemPrompt, type AIProvider } from '../ai/index.js';
import { buildContext, maybeSummarize } from '../memory/conversation.js';
import { isAiActive } from '../takeover/takeover.js';
import { retry, withTimeout, Semaphore } from '../util.js';

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

  constructor(
    private readonly provider: AIProvider,
    private readonly send: SendReply,
  ) {}

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
      if (!this.provider.isReady()) {
        logger.error(
          '[AI] Cannot reply to %s: provider "%s" not ready (%s)',
          jid,
          this.provider.name,
          this.provider.notReadyReason(),
        );
        return;
      }

      const reply = await this.generate(jid, combined);
      if (reply) {
        await this.send(jid, reply);
        store.addMessage(jid, 'assistant', reply);
        logger.info('[WHATSAPP] reply sent to %s', jid);
        // Fold older history into a summary if it has grown (best-effort).
        void maybeSummarize(jid, this.provider);
      } else {
        logger.warn('[AI] Empty reply for %s', jid);
      }
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

  private async generate(jid: string, userText: string): Promise<string> {
    const { systemSuffix, history } = buildContext(jid);
    const system = getSystemPrompt() + systemSuffix;

    const release = await this.globalLimiter.acquire();
    try {
      logger.info('[AI] request started for %s', jid);
      const reply = await retry(
        () =>
          withTimeout(
            this.provider.generateReply({ system, history, user: userText }),
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
