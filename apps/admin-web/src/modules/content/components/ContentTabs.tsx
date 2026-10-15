// apps/admin-web/src/modules/content/components/ContentTabs.tsx
import { adminText } from '@/core/i18n';
import { TabLinks } from '@/shared/ui';

/** Materials | Tests, on the Material Management overview. */
export function SectionTabs({ current }: { current: 'materials' | 'tests' }) {
  return (
    <TabLinks
      label={adminText('admin.content.sections')}
      current={current}
      items={[
        {
          id: 'materials',
          href: '/content',
          label: adminText('admin.content.tab.materials'),
          icon: 'module',
        },
        {
          id: 'tests',
          href: '/content/tests',
          label: adminText('admin.content.tab.tests'),
          icon: 'quiz',
        },
      ]}
    />
  );
}

/** Modules | Notes | Amharic Notes, on the three Material pages. */
export function MaterialTabs({ current }: { current: 'modules' | 'notes' | 'amharic-notes' }) {
  return (
    <TabLinks
      label={adminText('admin.content.materialTabs')}
      current={current}
      items={[
        {
          id: 'modules',
          href: '/content/modules',
          label: adminText('admin.nav.modules'),
          icon: 'module',
        },
        { id: 'notes', href: '/content/notes', label: adminText('admin.nav.notes'), icon: 'note' },
        {
          id: 'amharic-notes',
          href: '/content/amharic-notes',
          label: adminText('admin.nav.amharicNotes'),
          icon: 'translate',
        },
      ]}
    />
  );
}
