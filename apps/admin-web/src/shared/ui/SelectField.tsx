// apps/admin-web/src/shared/ui/SelectField.tsx
import { useId } from 'react';
import type { SelectHTMLAttributes } from 'react';

import styles from './SelectField.module.css';

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectFieldProps extends Omit<
  SelectHTMLAttributes<HTMLSelectElement>,
  'id' | 'children'
> {
  label: string;
  options: readonly SelectOption[];
  /** First, empty choice such as "All universities". Leave out when a value is required. */
  placeholder?: string;
  /** Already translated message shown under the field. */
  error?: string;
  /** Hide the label visually (it stays for screen readers), for filters whose placeholder says it all. */
  hideLabel?: boolean;
}

export function SelectField({
  label,
  options,
  placeholder,
  error,
  hideLabel = false,
  className,
  ...rest
}: SelectFieldProps) {
  const id = useId();
  const errorId = `${id}-error`;
  return (
    <div className={`${styles.field} ${className ?? ''}`}>
      <label htmlFor={id} className={hideLabel ? 'sr-only' : styles.label}>
        {label}
      </label>
      <select
        id={id}
        className={`${styles.select} ${error ? styles.invalid : ''}`}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        {...rest}
      >
        {placeholder !== undefined ? <option value="">{placeholder}</option> : null}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error ? (
        <p id={errorId} className={styles.error}>
          {error}
        </p>
      ) : null}
    </div>
  );
}
