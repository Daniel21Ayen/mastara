// apps/admin-web/src/modules/catalog/components/StatusFields.tsx
import { CATALOG_STATUSES } from '@mastara/domain';
import type { CatalogStatus } from '@mastara/domain';

import { adminText } from '@/core/i18n';
import { SelectField, TextArea } from '@/shared/ui';

import { reasonRequired } from '../lib/reason';

interface StatusFieldsProps {
  value: CatalogStatus;
  /** The saved status when editing; leave out when adding. */
  saved?: CatalogStatus;
  reason: string;
  reasonError?: string;
  onStatus: (status: CatalogStatus) => void;
  onReason: (reason: string) => void;
}

/** Publish state, plus the reason box that appears only when the change takes something away from students. */
export function StatusFields({
  value,
  saved,
  reason,
  reasonError,
  onStatus,
  onReason,
}: StatusFieldsProps) {
  const askReason = reasonRequired(saved, value);
  return (
    <>
      <SelectField
        label={adminText('admin.catalog.form.status')}
        options={CATALOG_STATUSES.map((status) => ({
          value: status,
          label: adminText(`admin.catalog.status.${status}`),
        }))}
        value={value}
        onChange={(event) => onStatus(event.target.value as CatalogStatus)}
      />
      {askReason ? (
        <TextArea
          label={adminText('admin.catalog.form.unpublishReason')}
          value={reason}
          onChange={(event) => onReason(event.target.value)}
          error={reasonError}
        />
      ) : null}
    </>
  );
}
