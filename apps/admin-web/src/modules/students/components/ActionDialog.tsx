// apps/admin-web/src/modules/students/components/ActionDialog.tsx
'use client';

import { reasonSchema } from '@mastara/contracts';
import { useState } from 'react';
import type { FormEvent } from 'react';

import { adminText, adminTextFor, errorText } from '@/core/i18n';
import { Button, Modal, TextArea } from '@/shared/ui';

import styles from './ActionDialog.module.css';

interface ActionDialogProps {
  title: string;
  body: string;
  confirmLabel: string;
  /** Use `danger` for actions that cut access. */
  tone?: 'primary' | 'danger';
  /** Ask for a reason. It is passed to `onConfirm` and saved in the audit log. */
  withReason?: boolean;
  /** Runs the action. The dialog closes when it resolves and shows the error when it throws. */
  onConfirm: (reason: string) => Promise<void>;
  onClose: () => void;
}

/** Confirmation step for sensitive actions (SRS section 6: confirm, require a reason, audit). */
export function ActionDialog({
  title,
  body,
  confirmLabel,
  tone = 'primary',
  withReason = false,
  onConfirm,
  onClose,
}: ActionDialogProps) {
  const [reason, setReason] = useState('');
  const [reasonError, setReasonError] = useState<string | undefined>();
  const [failure, setFailure] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setFailure(null);

    if (withReason) {
      const parsed = reasonSchema.safeParse(reason);
      if (!parsed.success) {
        setReasonError(adminTextFor(parsed.error.issues[0]?.message ?? 'validation.reason'));
        return;
      }
    }
    setReasonError(undefined);
    setBusy(true);
    try {
      await onConfirm(reason.trim());
      onClose();
    } catch (cause) {
      setFailure(errorText(cause));
      setBusy(false);
    }
  }

  return (
    <Modal title={title} onClose={busy ? () => undefined : onClose}>
      <form className={styles.form} onSubmit={submit} noValidate>
        <p className={styles.body}>{body}</p>

        {withReason ? (
          <TextArea
            label={adminText('admin.student.reason.label')}
            value={reason}
            onChange={(event) => {
              setReason(event.target.value);
              setReasonError(undefined);
            }}
            error={reasonError}
            autoFocus
          />
        ) : null}
        {withReason ? (
          <p className={styles.hint}>{adminText('admin.student.reason.hint')}</p>
        ) : null}

        {failure ? (
          <p className={styles.failure} role="alert">
            {failure}
          </p>
        ) : null}

        <div className={styles.buttons}>
          <Button variant="outline" onClick={onClose} disabled={busy}>
            {adminText('admin.common.cancel')}
          </Button>
          <Button type="submit" variant={tone === 'danger' ? 'danger' : 'primary'} disabled={busy}>
            {busy ? adminText('admin.common.saving') : confirmLabel}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
