// apps/admin-web/src/shared/ui/Button.tsx
import type { ButtonHTMLAttributes } from 'react';

import styles from './Button.module.css';

export type ButtonVariant = 'primary' | 'outline' | 'danger';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  fullWidth?: boolean;
}

export function Button({
  variant = 'primary',
  fullWidth = false,
  className,
  type = 'button',
  ...rest
}: ButtonProps) {
  const classes = [styles.button, styles[variant], fullWidth ? styles.full : '', className ?? '']
    .filter(Boolean)
    .join(' ');
  return <button type={type} className={classes} {...rest} />;
}
