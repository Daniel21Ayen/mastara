// apps/admin-web/src/shared/ui/Card.tsx
import type { HTMLAttributes } from 'react';

import styles from './Card.module.css';

export function Card({ className, ...rest }: HTMLAttributes<HTMLElement>) {
  return <section className={`${styles.card} ${className ?? ''}`} {...rest} />;
}

export function CardTitle({ className, ...rest }: HTMLAttributes<HTMLHeadingElement>) {
  return <h2 className={`${styles.title} ${className ?? ''}`} {...rest} />;
}
