// apps/admin-web/src/modules/shell/components/Sidebar.tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

import { adminText } from '@/core/i18n';
import { activeNavId, activeSubNavId, ADMIN_NAV } from '@/core/navigation';
import type { AdminNavGroup } from '@/core/navigation';
import { Icon } from '@/shared/ui';

import styles from './Sidebar.module.css';

interface SidebarProps {
  /** Called after a link is chosen, so the mobile drawer can close. */
  onNavigate?: () => void;
}

export function Sidebar({ onNavigate }: SidebarProps) {
  const pathname = usePathname();
  const activeId = activeNavId(pathname);
  const activeSub = activeSubNavId(pathname);
  // Groups the admin closed by hand. A group is open by default while its item is active.
  const [closed, setClosed] = useState<readonly string[]>([]);

  const toggle = (id: string) =>
    setClosed((current) =>
      current.includes(id) ? current.filter((x) => x !== id) : [...current, id],
    );

  function renderGroup(group: AdminNavGroup, itemActive: boolean) {
    const open = itemActive && !closed.includes(group.id);
    const listId = `nav-group-${group.id}`;
    return (
      <li key={group.id}>
        <button
          type="button"
          className={styles.group}
          aria-expanded={open}
          aria-controls={listId}
          onClick={() => toggle(group.id)}
        >
          <span>{adminText(group.labelKey)}</span>
          <Icon name={open ? 'chevronUp' : 'chevronDown'} size={16} />
        </button>
        {open ? (
          <ul id={listId} className={styles.sub}>
            {group.items.map((leaf) => {
              const active = leaf.id === activeSub;
              return (
                <li key={leaf.id}>
                  <Link
                    href={leaf.href}
                    className={`${styles.leaf} ${active ? styles.leafActive : ''}`}
                    aria-current={active ? 'page' : undefined}
                    onClick={onNavigate}
                  >
                    {adminText(leaf.labelKey)}
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : null}
      </li>
    );
  }

  return (
    <div className={styles.sidebar}>
      <div className={styles.brand}>
        <p className={styles.name}>{adminText('admin.app.name')}</p>
        <p className={styles.portal}>{adminText('admin.app.portal')}</p>
      </div>
      <nav aria-label={adminText('admin.nav.label')}>
        <ul className={styles.list}>
          {ADMIN_NAV.map((item) => {
            const active = item.id === activeId;
            // On a sub-page the item is highlighted but not "the current page"; only the leaf is.
            const current = active && activeSub === null;
            return (
              <li key={item.id}>
                <Link
                  href={item.href}
                  className={`${styles.link} ${active ? styles.active : ''}`}
                  aria-current={current ? 'page' : undefined}
                  onClick={onNavigate}
                >
                  {adminText(item.labelKey)}
                </Link>
                {item.groups && active ? (
                  <ul className={styles.groups}>
                    {item.groups.map((group) => renderGroup(group, active))}
                  </ul>
                ) : null}
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
