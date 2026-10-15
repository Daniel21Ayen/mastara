// apps/admin-web/src/shared/ui/Modal.tsx
'use client';

import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';

import styles from './Modal.module.css';

interface ModalProps {
  title: string;
  /** Called when the admin presses Escape or clicks outside the dialog. */
  onClose: () => void;
  /** A wider dialog for editors. */
  wide?: boolean;
  children: ReactNode;
}

/**
 * A modal dialog built on the browser's own `<dialog>`: it traps focus, closes on Escape and
 * returns focus to the button that opened it. Render it only while it should be open.
 */
export function Modal({ title, onClose, wide = false, children }: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
    return () => dialog?.close();
  }, []);

  return (
    <dialog
      ref={ref}
      className={`${styles.dialog} ${wide ? styles.wide : ''}`}
      aria-labelledby="modal-title"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className={styles.body}>
        <h2 id="modal-title" className={styles.title}>
          {title}
        </h2>
        {children}
      </div>
    </dialog>
  );
}
