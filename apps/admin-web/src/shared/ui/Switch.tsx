// apps/admin-web/src/shared/ui/Switch.tsx
'use client';

import styles from './Switch.module.css';

interface SwitchProps {
  checked: boolean;
  /** Spoken name of the switch, for example "AASTU: active". */
  label: string;
  /** Visible word beside the switch, for example "Active". */
  text?: string;
  disabled?: boolean;
  onChange: (next: boolean) => void;
}

/** An on/off button. The word beside it always says the state, so colour is never the only signal. */
export function Switch({ checked, label, text, disabled = false, onChange }: SwitchProps) {
  return (
    <span className={styles.wrap}>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        className={styles.track}
        disabled={disabled}
        onClick={() => onChange(!checked)}
      >
        <span className={styles.thumb} aria-hidden="true" />
      </button>
      {text ? <span className={styles.text}>{text}</span> : null}
    </span>
  );
}
