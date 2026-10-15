// apps/admin-web/src/modules/content/components/ContentHeader.tsx
import { adminText } from '@/core/i18n';
import { PageHeader } from '@/shared/ui';

import { CoursePicker } from './CoursePicker';

/** "Material Management" with the course picker at the right, as on every Material page. */
export function ContentHeader() {
  return (
    <PageHeader
      title={adminText('admin.content.title')}
      subtitle={adminText('admin.content.subtitle')}
      actions={<CoursePicker />}
    />
  );
}
