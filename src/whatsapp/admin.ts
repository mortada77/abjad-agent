import { activeProvider } from '../ai/index.js';
import { store } from '../db/index.js';
import { executiveAsk } from '../executive/brain.js';
import { logger } from '../logger.js';
import { resume } from '../takeover/takeover.js';

export type AdminSend = (jid: string, text: string) => Promise<void>;

const DECISION_RE = /^(?:رد|reply)\s*#?(\d+)\s*[:：\-]?\s+([\s\S]+)$/i;

/** Owner-only WhatsApp channel: executive chat + safe escalation resolution. */
export async function handleAdminWhatsApp(text: string, adminJid: string, send: AdminSend): Promise<void> {
  const match = text.trim().match(DECISION_RE);
  if (!match) {
    const result = await executiveAsk(text.trim(), 'whatsapp-admin');
    await send(adminJid, result.reply);
    return;
  }

  const escalationId = Number(match[1]);
  const decision = match[2].trim();
  const escalation = store.getEscalation(escalationId);
  if (!escalation) {
    await send(adminJid, `ما لكيت تصعيد برقم #${escalationId}. اكتب رقم الحالة الموجود بالإشعار.`);
    return;
  }
  if (escalation.handled) {
    await send(adminJid, `التصعيد #${escalationId} منتهي من قبل.`);
    return;
  }

  let customerReply = decision;
  const provider = activeProvider();
  if (provider.isReady()) {
    try {
      customerReply = await provider.generateReply({
        system:
          'أعد صياغة قرار الإدارة كرسالة واتساب عراقية مهذبة وواضحة للعميل. ' +
          'لا تذكر التعليمات أو الذكاء الاصطناعي، لا تضف وعوداً أو أسعاراً غير موجودة، ولا تغيّر معنى قرار الإدارة. أرجع نص الرسالة فقط.',
        history: [],
        user: `طلب العميل: ${escalation.last_msg || escalation.reason}\nقرار الإدارة: ${decision}`,
      });
    } catch (err) {
      logger.warn('[ADMIN] Failed to polish escalation #%d: %s', escalationId, (err as Error).message);
    }
  }

  customerReply = customerReply.trim() || decision;
  await send(escalation.jid, customerReply);
  store.addMessage(escalation.jid, 'assistant', customerReply);
  store.markEscalationHandled(escalationId);
  resume(escalation.jid);
  logger.info('[ADMIN] Escalation #%d resolved over WhatsApp', escalationId);
  await send(adminJid, `✅ وصل ردك للعميل وانغلق التصعيد #${escalationId}.`);
}
