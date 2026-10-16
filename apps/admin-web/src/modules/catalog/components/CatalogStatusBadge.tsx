// apps/admin-web/src/modules/catalog/components/CatalogStatusBadge.tsx
import type { CatalogStatus } from '@mastara/domain';

import { adminText } from '@/core/i18n';
import { Badge } from '@/shared/ui';
import type { BadgeTone } from '@/shared/ui';

const TONE: Record<CatalogStatus, BadgeTone> = { PUBLISHED: 'primary', DRAFT: 'neutral' };

/** The word is always shown; colour only adds emphasis. */
export function CatalogStatusBadge({ status }: { status: CatalogStatus }) {
  return <Badge tone={TONE[status]}>{adminText(`admin.catalog.status.${status}`)}</Badge>;
}
