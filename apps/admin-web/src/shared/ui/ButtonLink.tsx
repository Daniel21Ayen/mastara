// apps/admin-web/src/shared/ui/ButtonLink.tsx
import Link from 'next/link';
import type { ComponentProps } from 'react';

import styles from './Button.module.css';
import type { ButtonVariant } from './Button';

interface ButtonLinkProps extends Omit<ComponentProps<typeof Link>, 'className'> {
  variant?: ButtonVariant;
}

/** A link that looks like a Button, for moving to another page (a Button is for actions on this one). */
export function ButtonLink({ variant = 'primary', ...rest }: ButtonLinkProps) {
  return <Link className={`${styles.button} ${styles[variant]} ${styles.link}`} {...rest} />;
}
