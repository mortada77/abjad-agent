import { logger } from '../logger.js';
import { store } from '../db/index.js';
import { activeProvider } from '../ai/index.js';
import { EXECUTIVE_SYSTEM_PROMPT } from './prompt.js';
import { buildExecutiveContext, maybeSummarizeExecutive } from './memory.js';
import { EXECUTIVE_TOOLS, executeTool, toolHint } from './tools.js';

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
      const res = await provider.runWithTools({
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
      });
      reply = res.text;
    } else {
      // Provider without tool support: plain reply (no live data).
      reply = await provider.generateReply({ system, history: priorHistory, user: message });
    }
  } catch (err) {
    logger.error('[EXEC] ask failed: %s', (err as Error).message);
    return { reply: 'صار خطأ وأنا أعالج طلبك. جرّب مرة ثانية.', toolHints };
  }

  reply = (reply || '').trim() || 'ما وصلني رد واضح، جرّب صياغة ثانية.';
  store.execAddMessage('assistant', reply, session);
  void maybeSummarizeExecutive(session);
  return { reply, toolHints };
}
