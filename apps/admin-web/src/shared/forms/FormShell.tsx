// apps/admin-web/src/shared/forms/FormShell.tsx
'use client';

import type { FormEvent, ReactNode } from 'react';

import { adminText } from '@/core/i18n';
import { Button, Modal } from '@/shared/ui';

import styles from './FormShell.module.css';

interface FormShellProps {
  title: string;
  submitLabel: string;
  busy: boolean;
  /** Already translated message when the save failed. */
  failure: string | null;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onClose: () => void;
  children: ReactNode;
}

/** Dialog frame shared by the catalog forms: fields, a failure line and Cancel / Save. */
export function FormShell({
  title,
  submitLabel,
  busy,
  failure,
  onSubmit,
  onClose,
  children,
}: FormShellProps) {
  return (
    <Modal title={title} onClose={busy ? () => undefined : onClose}>
      <form className={styles.form} onSubmit={onSubmit} noValidate>
        {children}
        {failure ? (
          <p className={styles.failure} role="alert">
            {failure}
          </p>
        ) : null}
        <div className={styles.buttons}>
          <Button variant="outline" onClick={onClose} disabled={busy}>
            {adminText('admin.common.cancel')}
          </Button>
          <Button type="submit" disabled={busy}>
            {busy ? adminText('admin.common.saving') : submitLabel}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
