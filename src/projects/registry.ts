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
      'منصّة أبجد لإدارة المطاعم: Abjad Kitchen و Abjad Cashier، مع وكيل واتساب للتسويق والعملاء.',
  },
];

export function listProjects(): ProjectInfo[] {
  return PROJECTS;
}
