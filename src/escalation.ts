/**
 * Escalation protocol.
 *
 * The model is instructed (see ai/index.ts) to append a line
 *     #ESCALATE: <reason>
 * whenever a human/management decision is needed (special pricing, discounts,
 * offers, complaints, account/billing issues, or an explicit request for a
 * human). That line is a SYSTEM signal — it is stripped before the customer
 * sees the reply, and it triggers an admin notification + AI pause.
 */

const ESCALATE_RE = /^[ \t]*#\s*ESCALATE\s*:[ \t]*(.*)$/im;

export interface Escalation {
  reason: string;
  /** The customer-facing reply with the marker line removed. */
  cleanReply: string;
}

export function parseEscalation(reply: string): Escalation | null {
  const m = reply.match(ESCALATE_RE);
  if (!m) return null;
  const reason = (m[1] || '').trim() || 'العميل يحتاج قرار من الإدارة';
  const cleanReply = reply
    .replace(ESCALATE_RE, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  return { reason, cleanReply };
}

/** Instruction appended to the system prompt so the contract stays fixed. */
export const ESCALATION_PROTOCOL = `

## بروتوكول التصعيد (مهم)
إذا وصلت لحالة تحتاج قرار من الإدارة — مثل: تخفيض/سعر خاص، عرض خاص، شكوى أو زعل، مشكلة حساب/فاتورة/اشتراك، أو العميل يطلب صراحة يحچي مع شخص — سوِّ شيئين:
1. ردّ على العميل بلطف إنك **راح تتواصل مع الإدارة وترجعله بأقرب وقت**. **لا تعطي أي رقم هاتف إطلاقاً.**
2. بعد ردّك، أضف **سطر أخير منفصل** بهذا الشكل بالضبط (هذا السطر إشارة داخلية للنظام، العميل ما راح يشوفه):
#ESCALATE: <سبب مختصر جداً بالعربي وشنو يريد العميل>

لا تضيف السطر إلا لمّا فعلاً يحتاج قرار إدارة. للأسئلة العامة جاوب طبيعي بدون هذا السطر.`;
