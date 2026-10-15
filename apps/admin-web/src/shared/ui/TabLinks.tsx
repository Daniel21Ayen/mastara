// apps/admin-web/src/shared/ui/TabLinks.tsx
import Link from 'next/link';

import { Icon } from './Icon';
import type { IconName } from './Icon';
import styles from './TabLinks.module.css';

export interface TabLinkItem {
  id: string;
  href: string;
  label: string;
  icon?: IconName;
}

interface TabLinksProps {
  /** Names the group for screen readers. */
  label: string;
  items: readonly TabLinkItem[];
  current: string;
}

/** Button-style tabs that are real links, so each tab is its own route. The current one is filled. */
export function TabLinks({ label, items, current }: TabLinksProps) {
  return (
    <nav className={styles.tabs} aria-label={label}>
      {items.map((item) => (
        <Link
          key={item.id}
          href={item.href}
          className={`${styles.tab} ${item.id === current ? styles.current : ''}`}
          aria-current={item.id === current ? 'page' : undefined}
        >
          {item.icon ? <Icon name={item.icon} size={18} /> : null}
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
