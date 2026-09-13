import type { ToolDef } from '../ai/provider.js';
import { store } from '../db/index.js';
import { listProjects } from '../projects/registry.js';
import * as abjad from '../projects/abjad.js';

const noArgs = { type: 'object', properties: {}, additionalProperties: false };

/** Tool definitions exposed to the Executive AI (read-only data + tasks). */
export const EXECUTIVE_TOOLS: ToolDef[] = [
  { name: 'projects_list', description: 'قائمة المشاريع المتاحة في النظام.', parameters: noArgs },
  { name: 'abjad_get_summary', description: 'ملخص أبجد اليوم: محادثات، عملاء جدد، فرص بيع، حالات تحتاج تدخل، والـpipeline.', parameters: noArgs },
  { name: 'abjad_get_hot_leads', description: 'العملاء الأكثر اهتماماً (فرص البيع).', parameters: { type: 'object', properties: { limit: { type: 'number' } }, additionalProperties: false } },
  { name: 'abjad_get_new_customers', description: 'العملاء الجدد اليوم.', parameters: noArgs },
  { name: 'abjad_search_customers', description: 'بحث عن عملاء بالاسم أو الرقم.', parameters: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'], additionalProperties: false } },
  { name: 'abjad_get_customer', description: 'تفاصيل عميل محدد ومحادثته وتحليله (بالاسم أو الرقم).', parameters: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'], additionalProperties: false } },
  { name: 'abjad_get_pending_human', description: 'الحالات التي تحتاج تدخل بشري (تصعيدات).', parameters: noArgs },
  { name: 'abjad_get_sales_pipeline', description: 'مراحل البيع وأعدادها.', parameters: noArgs },
  { name: 'abjad_get_marketing_performance', description: 'أداء التسويق: المحادثات، الردود، ما حلّه AI وحده، والتصعيدات.', parameters: noArgs },
  { name: 'abjad_get_recent_customers', description: 'آخر العملاء الذين تفاعلوا.', parameters: { type: 'object', properties: { limit: { type: 'number' } }, additionalProperties: false } },
  { name: 'task_create', description: 'إنشاء مهمة جديدة للمالك.', parameters: { type: 'object', properties: { title: { type: 'string' }, description: { type: 'string' }, priority: { type: 'string', enum: ['low', 'normal', 'high'] } }, required: ['title'], additionalProperties: false } },
  { name: 'task_list', description: 'عرض المهام (open افتراضياً).', parameters: { type: 'object', properties: { status: { type: 'string', enum: ['open', 'done'] } }, additionalProperties: false } },
  { name: 'task_complete', description: 'إنهاء مهمة برقمها.', parameters: { type: 'object', properties: { id: { type: 'number' } }, required: ['id'], additionalProperties: false } },
  { name: 'task_update', description: 'تعديل مهمة.', parameters: { type: 'object', properties: { id: { type: 'number' }, title: { type: 'string' }, priority: { type: 'string' }, status: { type: 'string' } }, required: ['id'], additionalProperties: false } },
];

/** Short human-friendly status shown on the animated head while a tool runs. */
export function toolHint(name: string): string {
  if (name.startsWith('abjad_get_customer') || name.startsWith('abjad_search')) return 'أراجع العميل...';
  if (name.startsWith('abjad_get_pending')) return 'أشوف الحالات...';
  if (name.startsWith('abjad_get_marketing')) return 'أراجع التسويق...';
  if (name.startsWith('abjad')) return 'أراجع أبجد...';
  if (name.startsWith('task')) return 'أرتّب المهام...';
  return 'أعالج...';
}

export async function executeTool(name: string, args: any): Promise<any> {
  switch (name) {
    case 'projects_list':
      return listProjects();
    case 'abjad_get_summary':
      return abjad.getSummary();
    case 'abjad_get_hot_leads':
      return abjad.getHotLeads(args?.limit ?? 10);
    case 'abjad_get_new_customers':
      return abjad.getNewCustomers();
    case 'abjad_search_customers':
      return abjad.searchCustomers(String(args?.query ?? ''));
    case 'abjad_get_customer':
      return abjad.getCustomer(String(args?.query ?? ''));
    case 'abjad_get_pending_human':
      return abjad.getPendingHuman();
    case 'abjad_get_sales_pipeline':
      return abjad.getSalesPipeline();
    case 'abjad_get_marketing_performance':
      return abjad.getMarketingPerformance();
    case 'abjad_get_recent_customers':
      return abjad.getRecentCustomers(args?.limit ?? 15);
    case 'task_create': {
      const id = store.taskCreate({ title: String(args.title), description: args.description, priority: args.priority });
      store.audit('executive', 'task_create', `#${id} ${args.title}`);
      return { ok: true, id };
    }
    case 'task_list':
      return store.taskList(args?.status);
    case 'task_complete': {
      const ok = store.taskUpdate(Number(args.id), { status: 'done' });
      store.audit('executive', 'task_complete', `#${args.id}`);
      return { ok };
    }
    case 'task_update': {
      const ok = store.taskUpdate(Number(args.id), { title: args.title, priority: args.priority, status: args.status });
      return { ok };
    }
    default:
      return { error: 'unknown tool: ' + name };
  }
}
