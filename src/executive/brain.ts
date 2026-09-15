import { logger } from '../logger.js';
import { store } from '../db/index.js';
import { activeProvider } from '../ai/index.js';
import { EXECUTIVE_SYSTEM_PROMPT } from './prompt.js';
import { buildExecutiveContext, maybeSummarizeExecutive } from './memory.js';
import { EXECUTIVE_TOOLS, executeTool, toolHint } from './tools.js';
import { retry, withTimeout } from '../util.js';
import { config } from '../config.js';

export interface ExecutiveReply {
  reply: string;
  toolHints: string[];
}

/**
 * Executive AI turn: builds owner context, runs the tool-calling loop so the
 * model can read real project data when needed, persists memory.
 */
export async function executiveAsk(message: string, session = 'default'): Promise<ExecutiveReply> {
  const provider = activeProvider();
  if (!provider.isReady()) {
    return { reply: 'مزود الذكاء مو جاهز — تأكد من مفتاح الـAPI بالإعدادات.', toolHints: [] };
  }

  store.execAddMessage('user', message, session);
  const { summarySuffix, history } = buildExecutiveContext(session);
  // history includes the message we just added; drop the last (it's `message`).
  const priorHistory = history.slice(0, -1);
  const system = EXECUTIVE_SYSTEM_PROMPT + summarySuffix;
  const toolHints: string[] = [];

  let reply: string;
  try {
    if (typeof provider.runWithTools === 'function') {
      const res = await retry(
        () =>
          withTimeout(
            provider.runWithTools!({
              system,
              history: priorHistory,
              user: message,
              tools: EXECUTIVE_TOOLS,
              execute: executeTool,
              onToolStart: (name) => {
                const h = toolHint(name);
                if (!toolHints.includes(h)) toolHints.push(h);
              },
              maxRounds: 6,
            }),
            config.ai.timeoutMs,
            'Executive AI request',
          ),
        {
          retries: config.ai.maxRetries,
          onRetry: (attempt, error) =>
            logger.warn('[EXEC] retry %d: %s', attempt, error.message),
        },
      );
      reply = res.text;
    } else {
      // Provider without tool support: plain reply (no live data).
      reply = await provider.generateReply({ system, history: priorHistory, user: message });
    }
  } catch (err) {
    logger.error('[EXEC] ask failed: %s', (err as Error).message);
    try {
      reply = (
        await withTimeout(
          provider.generateReply({
            system:
              system +
              '\n\nتعذّر استخدام الأدوات بهذه اللحظة. جاوب على آخر رسالة بذكاء وباختصار اعتماداً على سياق المحادثة، ولا تدّعي أنك نفذت شيئاً أو تطلب منه إعادة المحاولة.',
            history: priorHistory,
            user: message,
          }),
          config.ai.timeoutMs,
          'Executive AI recovery',
        )
      ).trim();
    } catch (recoveryErr) {
      logger.error('[EXEC] recovery failed: %s', (recoveryErr as Error).message);
      // Do not persist a canned failure in memory: it poisons following turns
      // and makes every message look like the same failed request.
      return {
        reply: 'الاتصال بالذكاء متوقف مؤقتاً. ما حفظت هذا الرد ضمن المحادثة حتى ما تتكرر المشكلة.',
        toolHints,
      };
    }
  }

  reply = (reply || '').trim();
  // Some reasoning models can exhaust a small completion budget before they
  // emit visible text. Recover once instead of trapping the owner in a
  // repetitive fallback loop.
  if (!reply) {
    logger.warn('[EXEC] empty tool response; retrying once without tools');
    try {
      reply = (
        await provider.generateReply({
          system:
            system +
            '\n\nجاوب الآن مباشرةً وباختصار على آخر طلب. لا تكرر سؤالاً سابقاً ولا تطلب إعادة الصياغة.',
          history: priorHistory,
          user: message,
        })
      ).trim();
    } catch (err) {
      logger.error('[EXEC] empty-response recovery failed: %s', (err as Error).message);
    }
  }
  if (!reply) reply = 'صار خلل مؤقت بإخراج الرد. حاول مرة ثانية وأنا أعالجه.';
  store.execAddMessage('assistant', reply, session);
  void maybeSummarizeExecutive(session);
  return { reply, toolHints };
}
