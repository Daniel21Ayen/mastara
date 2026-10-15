// apps/admin-web/src/shared/ui/TextArea.tsx
import { useId } from 'react';
import type { TextareaHTMLAttributes } from 'react';

import styles from './TextField.module.css';

interface TextAreaProps extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'id'> {
  label: string;
  error?: string;
}

export function TextArea({ label, error, rows = 3, ...rest }: TextAreaProps) {
  const id = useId();
  const errorId = `${id}-error`;
  return (
    <div className={styles.field}>
      <label htmlFor={id} className={styles.label}>
        {label}
      </label>
      <textarea
        id={id}
        rows={rows}
        className={`${styles.input} ${styles.area} ${error ? styles.invalid : ''}`}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        {...rest}
      />
      {error ? (
        <p id={errorId} className={styles.error}>
          {error}
        </p>
      ) : null}
    </div>
  );
}
