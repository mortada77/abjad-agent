import { logger } from '../logger.js';
import { store } from '../db/index.js';
import { getSystemPrompt, activeProvider } from './index.js';

const STAGES = ['new', 'interested', 'trial', 'negotiation', 'subscribed', 'lost'];

export interface CustomerInsight {
  business: string;
  city: string;
  product: string;
  branches: string;
  current_system: string;
  problem: string;
  interest_pct: number;
  stage: string;
  next_step: string;
  summary: string;
}

function transcript(jid: string, limit = 40): string {
  return store
    .conversation(jid, limit)
    .map((m) => `${m.role === 'user' ? 'العميل' : 'الوكيل'}: ${m.content}`)
    .join('\n');
}

function extractJson(text: string): any | null {
  try {
    return JSON.parse(text);
  } catch {
    const a = text.indexOf('{');
    const b = text.lastIndexOf('}');
    if (a >= 0 && b > a) {
      try {
        return JSON.parse(text.slice(a, b + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
}

/** Analyse a customer's conversation into a structured sales insight (AI). */
export async function generateInsight(jid: string): Promise<CustomerInsight | null> {
  const provider = activeProvider();
  if (!provider.isReady()) return null;
  const convo = transcript(jid);
  if (!convo.trim()) return null;

  const system =
    'أنت محلل مبيعات لشركة أبجد (أنظمة مطاعم Abjad Kitchen و كاشير Abjad Cashier). ' +
    'حلّل محادثة العميل التالية وأعطِ ملخصاً بيعياً. ' +
    'أرجع **JSON فقط** بدون أي نص إضافي بهذا الشكل:\n' +
    '{"business":"نوع النشاط","city":"المدينة إن ذُكرت","product":"المنتج المهتم به",' +
    '"branches":"عدد الفروع إن ذُكر","current_system":"النظام الحالي إن ذُكر",' +
    '"problem":"المشكلة/الحاجة الأساسية","interest_pct":0-100,' +
    '"stage":"new|interested|trial|negotiation|subscribed|lost",' +
    '"next_step":"الخطوة المقترحة القادمة","summary":"سطر أو سطرين ملخص بالعراقي"}\n' +
    'إذا معلومة غير معروفة اكتب "غير معروف". interest_pct رقم يعبّر عن احتمال الشراء.';

  try {
    const raw = await provider.generateReply({ system, history: [], user: convo });
    const j = extractJson(raw);
    if (!j) return null;
    const insight: CustomerInsight = {
      business: String(j.business ?? 'غير معروف'),
      city: String(j.city ?? 'غير معروف'),
      product: String(j.product ?? 'غير معروف'),
      branches: String(j.branches ?? 'غير معروف'),
      current_system: String(j.current_system ?? 'غير معروف'),
      problem: String(j.problem ?? 'غير معروف'),
      interest_pct: Math.max(0, Math.min(100, Number(j.interest_pct) || 0)),
      stage: STAGES.includes(String(j.stage)) ? String(j.stage) : 'new',
      next_step: String(j.next_step ?? ''),
      summary: String(j.summary ?? ''),
    };
    store.setInsight(jid, JSON.stringify(insight), insight.interest_pct, insight.stage);
    return insight;
  } catch (err) {
    logger.warn('[INSIGHT] failed for %s: %s', jid, (err as Error).message);
    return null;
  }
}

/** Suggest the next reply for the operator (not sent automatically). */
export async function suggestReply(jid: string): Promise<string> {
  const provider = activeProvider();
  if (!provider.isReady()) return '';
  const convo = transcript(jid);
  const system =
    getSystemPrompt() +
    '\n\n(المطلوب الآن: اقترح فقط الرد التالي المناسب لهذا العميل باللهجة العراقية، رسالة وحدة قصيرة، بدون أي شرح إضافي.)';
  try {
    return (await provider.generateReply({ system, history: [], user: convo })).trim();
  } catch {
    return '';
  }
}

/** Craft a friendly customer message conveying a management decision. */
export async function composeDecision(decision: string): Promise<string> {
  const provider = activeProvider();
  if (!provider.isReady()) return decision;
  const system =
    'أنت Abjad Agi. صُغ رسالة قصيرة ودّية باللهجة العراقية تبلّغ العميل بقرار الإدارة التالي بشكل مهذب. ' +
    'لا تضف أي معلومة أو رقم غير مذكور. اكتب الرسالة فقط بدون أي شيء آخر.';
  try {
    const t = (await provider.generateReply({ system, history: [], user: decision })).trim();
    return t || decision;
  } catch {
    return decision;
  }
}

/** Analyse recent traffic for top questions & objections (AI, on demand). */
export async function analyzeTrends(): Promise<string> {
  const provider = activeProvider();
  if (!provider.isReady()) return 'مزود الذكاء غير جاهز.';
  const rows = store.raw
    .prepare(`SELECT content FROM messages WHERE role = 'user' ORDER BY id DESC LIMIT 200`)
    .all() as { content: string }[];
  if (rows.length === 0) return 'لا توجد رسائل كافية للتحليل بعد.';
  const text = rows.map((r) => '- ' + r.content).join('\n');
  const system =
    'حلّل رسائل عملاء شركة أبجد التالية وأعطِ تقريراً موجزاً بالعربي العراقي يتضمن: ' +
    'أكثر 5 أسئلة تتكرر، أكثر 3 اعتراضات تمنع البيع، ونصيحة واحدة لتحسين الردود. اكتب بنقاط مختصرة.';
  try {
    return (await provider.generateReply({ system, history: [], user: text })).trim();
  } catch (err) {
    return 'تعذّر التحليل: ' + (err as Error).message;
  }
}
