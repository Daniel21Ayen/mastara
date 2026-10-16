// apps/admin-web/src/modules/catalog/components/RowActions.tsx
'use client';

import type { CatalogStatus } from '@mastara/domain';

import { adminText } from '@/core/i18n';
import { Switch } from '@/shared/ui';

import styles from '../screens/Catalog.module.css';

interface ActiveSwitchProps {
  status: CatalogStatus;
  /** Name of the entry, spoken by screen readers. */
  name: string;
  onToggle: (next: CatalogStatus) => void;
}

/** Active / Inactive switch for a row. PUBLISHED is Active, DRAFT is Inactive. */
export function ActiveSwitch({ status, name, onToggle }: ActiveSwitchProps) {
  const active = status === 'PUBLISHED';
  return (
    <Switch
      checked={active}
      label={adminText('admin.catalog.toggle.label', { name })}
      text={adminText(active ? 'admin.catalog.status.PUBLISHED' : 'admin.catalog.status.DRAFT')}
      onChange={(next) => onToggle(next ? 'PUBLISHED' : 'DRAFT')}
    />
  );
}

interface RowButtonsProps {
  name: string;
  onEdit?: () => void;
  onDelete: () => void;
}

/** Edit and Delete buttons of a row. Semesters have no edit. */
export function RowButtons({ name, onEdit, onDelete }: RowButtonsProps) {
  return (
    <span className={styles.rowButtons}>
      {onEdit ? (
        <button
          type="button"
          className={styles.edit}
          aria-label={adminText('admin.catalog.editNamed', { name })}
          onClick={onEdit}
        >
          {adminText('admin.catalog.edit')}
        </button>
      ) : null}
      <button
        type="button"
        className={styles.danger}
        aria-label={adminText('admin.catalog.deleteNamed', { name })}
        onClick={onDelete}
      >
        {adminText('admin.catalog.delete')}
      </button>
    </span>
  );
}
