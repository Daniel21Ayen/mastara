// apps/admin-web/src/modules/catalog/components/RowDialogs.tsx
'use client';

import { DeleteDialog } from './DeleteDialog';
import { StatusChangeDialog } from './StatusChangeDialog';

/** What the admin asked for on one row and has not confirmed yet. */
export interface RowAction<T> {
  type: 'deactivate' | 'delete';
  row: T;
}

interface RowDialogsProps<T> {
  action: RowAction<T> | null;
  nameOf: (row: T) => string;
  onDeactivate: (row: T, reason: string) => Promise<void>;
  onDelete: (row: T) => Promise<void>;
  onClose: () => void;
}

/** The confirmation dialog for the row action in progress: reason to deactivate, or confirm to delete. */
export function RowDialogs<T>({ action, nameOf, onDeactivate, onDelete, onClose }: RowDialogsProps<T>) {
  if (!action) return null;
  const name = nameOf(action.row);
  return action.type === 'deactivate' ? (
    <StatusChangeDialog
      name={name}
      onConfirm={(reason) => onDeactivate(action.row, reason)}
      onClose={onClose}
    />
  ) : (
    <DeleteDialog name={name} onConfirm={() => onDelete(action.row)} onClose={onClose} />
  );
}
