// apps/admin-web/src/modules/catalog/components/StatusChangeDialog.tsx
'use client';

import { useState } from 'react';
import type { FormEvent } from 'react';

import { adminText, errorText } from '@/core/i18n';
import { FormShell, reasonProblem } from '@/shared/forms';
import { TextArea } from '@/shared/ui';

interface StatusChangeDialogProps {
  /** Name of the entry, for example "AASTU" or "ENG101". */
  name: string;
  /** Saves the change. Resolves when done, rejects with an error to show. */
  onConfirm: (reason: string) => Promise<void>;
  onClose: () => void;
}

/** Asks why an entry is being made inactive. Students lose sight of it, so the reason goes to the audit log. */
export function StatusChangeDialog({ name, onConfirm, onClose }: StatusChangeDialogProps) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | undefined>();
  const [failure, setFailure] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const problem = reasonProblem(true, reason);
    if (problem) {
      setError(problem);
      return;
    }
    setError(undefined);
    setFailure(null);
    setBusy(true);
    try {
      await onConfirm(reason);
      onClose();
    } catch (cause) {
      setFailure(errorText(cause));
      setBusy(false);
    }
  }

  return (
    <FormShell
      title={adminText('admin.catalog.deactivate.title', { name })}
      submitLabel={adminText('admin.catalog.deactivate.submit')}
      busy={busy}
      failure={failure}
      onSubmit={submit}
      onClose={onClose}
    >
      <p>{adminText('admin.catalog.deactivate.body', { name })}</p>
      <TextArea
        label={adminText('admin.catalog.form.unpublishReason')}
        value={reason}
        onChange={(event) => {
          setReason(event.target.value);
          setError(undefined);
        }}
        error={error}
        autoFocus
      />
    </FormShell>
  );
}
