// apps/admin-web/src/core/navigation/adminNav.ts
import type { AdminTranslationKey } from '@mastara/i18n';
import type { IconName } from '@/shared/ui';

export interface AdminNavLeaf {
  id: string;
  labelKey: AdminTranslationKey;
  href: string;
  permission?: string;
}

/** A labelled group of links under a menu item, for example Content → Material. */
export interface AdminNavGroup {
  id: string;
  labelKey: AdminTranslationKey;
  permission?: string;
  items: readonly AdminNavLeaf[];
}

export interface AdminNavItem extends AdminNavLeaf {
  /** Pages under this address also highlight the item (Courses owns all of `/catalog`). */
  section?: string;
  /** Icon shown beside the item label. */
  icon?: IconName;
  permission?: string;
  /** Flat sub-items directly under the item (no intermediate group button). */
  items?: readonly AdminNavLeaf[];
  /** Sub-menu shown while the item is active. */
  groups?: readonly AdminNavGroup[];
}

/** Sidebar order follows the approved Admin designs. Routes follow the folder structure. */
export const ADMIN_NAV: readonly AdminNavItem[] = [
  {
    id: 'dashboard',
    labelKey: 'admin.nav.dashboard',
    href: '/dashboard',
    icon: 'home',
  },
  {
    id: 'students',
    labelKey: 'admin.nav.students',
    href: '/students',
    icon: 'users',
    permission: 'students.read',
  },
  {
    id: 'courses',
    labelKey: 'admin.nav.courses',
    href: '/catalog/courses',
    section: '/catalog',
    icon: 'graduationCap',
    permission: 'catalog.read',
  },
  {
    id: 'content',
    labelKey: 'admin.nav.content',
    href: '/content',
    icon: 'fileText',
    permission: 'content.write',
    groups: [
      {
        id: 'material',
        labelKey: 'admin.nav.material',
        permission: 'content.write',
        items: [
          { id: 'modules', labelKey: 'admin.nav.modules', href: '/content/modules', permission: 'content.write' },
          { id: 'notes', labelKey: 'admin.nav.notes', href: '/content/notes', permission: 'content.write' },
          {
            id: 'amharic-notes',
            labelKey: 'admin.nav.amharicNotes',
            href: '/content/amharic-notes',
            permission: 'content.write',
          },
        ],
      },
      {
        id: 'tests',
        labelKey: 'admin.nav.tests',
        permission: 'content.write',
        items: [
          { id: 'quiz-1', labelKey: 'admin.nav.quiz1', href: '/content/tests/quiz-1', permission: 'content.write' },
          { id: 'quiz-2', labelKey: 'admin.nav.quiz2', href: '/content/tests/quiz-2', permission: 'content.write' },
          { id: 'quiz-3', labelKey: 'admin.nav.quiz3', href: '/content/tests/quiz-3', permission: 'content.write' },
        ],
      },
    ],
  },
  {
    id: 'scan-to-pdf',
    labelKey: 'admin.nav.scanToPdf',
    href: '/scan-to-pdf',
    icon: 'scan',
    permission: 'scans.write',
  },
  {
    id: 'questions',
    labelKey: 'admin.nav.questions',
    href: '/questions/mid-exams',
    section: '/questions',
    icon: 'helpCircle',
    permission: 'questions.write',
    items: [
      { id: 'mid-exams', labelKey: 'admin.nav.midExams', href: '/questions/mid-exams', permission: 'questions.write' },
      { id: 'final-exams', labelKey: 'admin.nav.finalExams', href: '/questions/final-exams', permission: 'questions.write' },
      { id: 'mock-exams', labelKey: 'admin.nav.mockExams', href: '/questions/mock-exams', permission: 'questions.write' },
      { id: 'coc-exams', labelKey: 'admin.nav.cocExams', href: '/questions/coc-exams', permission: 'questions.write' },
    ],
  },
  {
    id: 'payments',
    labelKey: 'admin.nav.payments',
    href: '/commerce/payments',
    icon: 'creditCard',
    permission: 'payments.review',
  },
  {
    id: 'pricing',
    labelKey: 'admin.nav.pricing',
    href: '/commerce/pricing',
    icon: 'tag',
    permission: 'pricing.read',
  },
  {
    id: 'support',
    labelKey: 'admin.nav.support',
    href: '/support',
    icon: 'headset',
    permission: 'support.reply',
  },
  {
    id: 'admins',
    labelKey: 'admin.nav.admins',
    href: '/admins',
    icon: 'shieldCheck',
    permission: 'admins.manage',
  },
];

const startsWith = (pathname: string, base: string): boolean =>
  pathname === base || pathname.startsWith(`${base}/`);

/** Filter the navigation list dynamically based on granted administrator permissions. */
export function filterAdminNav(
  items: readonly AdminNavItem[],
  can: (permission: string) => boolean,
): AdminNavItem[] {
  return items
    .filter((item) => (item.permission ? can(item.permission) : true))
    .map((item) => {
      const filteredItem = { ...item };

      if (item.items) {
        filteredItem.items = item.items.filter((leaf) =>
          leaf.permission ? can(leaf.permission) : true,
        );
      }

      if (item.groups) {
        filteredItem.groups = item.groups
          .filter((group) => (group.permission ? can(group.permission) : true))
          .map((group) => ({
            ...group,
            items: group.items.filter((leaf) => (leaf.permission ? can(leaf.permission) : true)),
          }))
          .filter((group) => group.items.length > 0);
      }

      return filteredItem;
    });
}

/** The item whose address is the start of `pathname` (so `/students/ST001` highlights Students). */
export function activeNavId(pathname: string): string | null {
  if (pathname === '/pricing' || pathname.startsWith('/pricing/')) return 'pricing';
  if (pathname === '/audit' || pathname.startsWith('/audit/')) return 'audit';
  if (pathname === '/reports' || pathname.startsWith('/reports/')) return 'reports';
  if (pathname === '/notifications' || pathname.startsWith('/notifications/')) return 'notifications';
  if (pathname === '/admins' || pathname.startsWith('/admins/')) return 'admins';
  const match = ADMIN_NAV.find((item) => startsWith(pathname, item.section ?? item.href));
  return match?.id ?? null;
}

/** The sub-menu link that is open at `pathname`, for example `notes` at `/content/notes`. */
export function activeSubNavId(pathname: string): string | null {
  if (pathname === '/content' || pathname === '/content/material' || pathname.startsWith('/content/material/')) {
    return 'modules';
  }
  if (pathname === '/content/tests') {
    return 'quiz-1';
  }
  for (const item of ADMIN_NAV) {
    if (item.items) {
      const match = item.items.find(
        (leaf) =>
          startsWith(pathname, leaf.href) ||
          startsWith(pathname, leaf.href.replace(/-exams$/, '')) ||
          startsWith(pathname, `${leaf.href}-exams`),
      );
      if (match) return match.id;
    }
    for (const group of item.groups ?? []) {
      const match = group.items.find((leaf) => startsWith(pathname, leaf.href));
      if (match) return match.id;
    }
  }
  return null;
}
