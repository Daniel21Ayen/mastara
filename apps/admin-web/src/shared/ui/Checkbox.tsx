// apps/admin-web/src/shared/ui/Checkbox.tsx
import { useId } from 'react';
import type { InputHTMLAttributes } from 'react';

import styles from './Checkbox.module.css';

interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'id' | 'type'> {
  label: string;
  /** Smaller text under the label that explains the choice. */
  hint?: string;
}

export function Checkbox({ label, hint, ...rest }: CheckboxProps) {
  const id = useId();
  const hintId = `${id}-hint`;
  return (
    <div className={styles.field}>
      <input
        id={id}
        type="checkbox"
        className={styles.box}
        aria-describedby={hint ? hintId : undefined}
        {...rest}
      />
      <label htmlFor={id} className={styles.label}>
        {label}
      </label>
      {hint ? (
        <p id={hintId} className={styles.hint}>
          {hint}
        </p>
      ) : null}
    </div>
  );
}
