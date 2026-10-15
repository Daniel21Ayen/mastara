// apps/admin-web/src/modules/tests/components/StatusBadge.tsx
import type { CatalogStatus } from '@mastara/domain';

import { adminText } from '@/core/i18n';
import { Badge } from '@/shared/ui';

/** Published or Draft; the word is always shown, the colour only adds emphasis. */
export function StatusBadge({ status }: { status: CatalogStatus }) {
  return (
    <Badge tone={status === 'PUBLISHED' ? 'primary' : 'neutral'}>
      {adminText(`admin.catalog.status.${status}`)}
    </Badge>
  );
}
