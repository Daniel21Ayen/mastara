// apps/admin-web/src/core/navigation/adminNav.ts
import type { AdminTranslationKey } from '@mastara/i18n';

export interface AdminNavLeaf {
  id: string;
  labelKey: AdminTranslationKey;
  href: string;
}

/** A labelled group of links under a menu item, for example Content → Material. */
export interface AdminNavGroup {
  id: string;
  labelKey: AdminTranslationKey;
  items: readonly AdminNavLeaf[];
}

export interface AdminNavItem extends AdminNavLeaf {
  /** Pages under this address also highlight the item (Courses owns all of `/catalog`). */
  section?: string;
  /** Sub-menu shown while the item is active. */
  groups?: readonly AdminNavGroup[];
}

/** Sidebar order follows the approved Admin designs. Routes follow the folder structure. */
export const ADMIN_NAV: readonly AdminNavItem[] = [
  { id: 'dashboard', labelKey: 'admin.nav.dashboard', href: '/dashboard' },
  { id: 'students', labelKey: 'admin.nav.students', href: '/students' },
  { id: 'courses', labelKey: 'admin.nav.courses', href: '/catalog/courses', section: '/catalog' },
  {
    id: 'content',
    labelKey: 'admin.nav.content',
    href: '/content',
    groups: [
      {
        id: 'material',
        labelKey: 'admin.nav.material',
        items: [
          { id: 'modules', labelKey: 'admin.nav.modules', href: '/content/modules' },
          { id: 'notes', labelKey: 'admin.nav.notes', href: '/content/notes' },
          {
            id: 'amharic-notes',
            labelKey: 'admin.nav.amharicNotes',
            href: '/content/amharic-notes',
          },
        ],
      },
      {
        id: 'tests',
        labelKey: 'admin.nav.tests',
        items: [
          { id: 'quiz-1', labelKey: 'admin.nav.quiz1', href: '/content/tests/quiz-1' },
          { id: 'quiz-2', labelKey: 'admin.nav.quiz2', href: '/content/tests/quiz-2' },
          { id: 'quiz-3', labelKey: 'admin.nav.quiz3', href: '/content/tests/quiz-3' },
        ],
      },
    ],
  },
  { id: 'scan-to-pdf', labelKey: 'admin.nav.scanToPdf', href: '/scan-to-pdf' },
  { id: 'questions', labelKey: 'admin.nav.questions', href: '/questions' },
  { id: 'payments', labelKey: 'admin.nav.payments', href: '/commerce/payments' },
  { id: 'pricing', labelKey: 'admin.nav.pricing', href: '/commerce/pricing' },
  { id: 'audit', labelKey: 'admin.nav.audit', href: '/audit' },
];

const startsWith = (pathname: string, base: string): boolean =>
  pathname === base || pathname.startsWith(`${base}/`);

/** The item whose address is the start of `pathname` (so `/students/ST001` highlights Students). */
export function activeNavId(pathname: string): string | null {
  const match = ADMIN_NAV.find((item) => startsWith(pathname, item.section ?? item.href));
  return match?.id ?? null;
}

/** The sub-menu link that is open at `pathname`, for example `notes` at `/content/notes`. */
export function activeSubNavId(pathname: string): string | null {
  for (const item of ADMIN_NAV) {
    for (const group of item.groups ?? []) {
      const match = group.items.find((leaf) => startsWith(pathname, leaf.href));
      if (match) return match.id;
    }
  }
  return null;
}
