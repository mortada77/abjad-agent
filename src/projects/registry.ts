/**
 * Project Registry. Executive AI sits above projects; Abjad is the first one.
 * Future projects register here and expose their own tools/adapters.
 */
export interface ProjectInfo {
  id: string;
  name: string;
  description: string;
}

export const PROJECTS: ProjectInfo[] = [
  {
    id: 'abjad',
    name: 'Abjad',
    description:
      'نظام أبجد لإدارة المطاعم والمطابخ: Abjad Kitchen وAbjad Cashier. يوجد إيجنت واتساب تابع للنظام يرد على العملاء ويسوّق هذه المنتجات، وليس منتجاً منفصلاً.',
  },
];

export function listProjects(): ProjectInfo[] {
  return PROJECTS;
}
