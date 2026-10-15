// apps/admin-web/src/shared/ui/Badge.tsx
import type { HTMLAttributes } from 'react';

import styles from './Badge.module.css';

/** Status chips use tints of the four palette colours, never extra colours. Always pair with text. */
export type BadgeTone = 'neutral' | 'primary' | 'danger';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
}

export function Badge({ tone = 'neutral', className, ...rest }: BadgeProps) {
  return <span className={`${styles.badge} ${styles[tone]} ${className ?? ''}`} {...rest} />;
}
