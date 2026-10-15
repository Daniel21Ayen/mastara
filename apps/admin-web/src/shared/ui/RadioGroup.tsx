// apps/admin-web/src/shared/ui/RadioGroup.tsx
import { useId } from 'react';

import styles from './RadioGroup.module.css';

export interface RadioOption<Value extends string> {
  value: Value;
  label: string;
}

interface RadioGroupProps<Value extends string> {
  /** The question the choices answer, for example "Question Type". */
  legend: string;
  options: readonly RadioOption<Value>[];
  value: Value | null;
  onChange: (value: Value) => void;
  /** Already translated message shown under the group. */
  error?: string;
  /** Lay the choices out in one row. */
  inline?: boolean;
}

/** One choice out of a few, as real radio buttons so the arrow keys work. */
export function RadioGroup<Value extends string>({
  legend,
  options,
  value,
  onChange,
  error,
  inline = false,
}: RadioGroupProps<Value>) {
  const name = useId();
  return (
    <fieldset className={styles.group} aria-invalid={error ? true : undefined}>
      <legend className={styles.legend}>{legend}</legend>
      <div className={inline ? styles.inline : styles.stack}>
        {options.map((option) => (
          <label key={option.value} className={styles.option}>
            <input
              type="radio"
              name={name}
              className={styles.radio}
              value={option.value}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
            />
            {option.label}
          </label>
        ))}
      </div>
      {error ? <p className={styles.error}>{error}</p> : null}
    </fieldset>
  );
}
