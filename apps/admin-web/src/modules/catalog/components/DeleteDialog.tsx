// apps/admin-web/src/modules/catalog/components/DeleteDialog.tsx
'use client';

import { useState } from 'react';
import type { FormEvent } from 'react';

import { adminText, errorText } from '@/core/i18n';
import { FormShell } from '@/shared/forms';

interface DeleteDialogProps {
  /** Name of the entry, for example "Civil Engineering". */
  name: string;
  /** Deletes it. Rejects with IN_USE when programs, courses or students still use it. */
  onConfirm: () => Promise<void>;
  onClose: () => void;
}

/** Asks once before deleting. Deleting cannot be undone. */
export function DeleteDialog({ name, onConfirm, onClose }: DeleteDialogProps) {
  const [failure, setFailure] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setFailure(null);
    setBusy(true);
    try {
      await onConfirm();
      onClose();
    } catch (cause) {
      setFailure(errorText(cause));
      setBusy(false);
    }
  }

  return (
    <FormShell
      title={adminText('admin.catalog.delete.title', { name })}
      submitLabel={adminText('admin.catalog.delete.submit')}
      busy={busy}
      failure={failure}
      onSubmit={submit}
      onClose={onClose}
    >
      <p>{adminText('admin.catalog.delete.body', { name })}</p>
    </FormShell>
  );
}
