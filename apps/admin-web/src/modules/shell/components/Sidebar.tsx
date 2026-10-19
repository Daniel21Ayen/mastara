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
  // Explicit open/close state. When not explicitly toggled, items default to open when active.
  const [expandedMap, setExpandedMap] = useState<Record<string, boolean>>({});

  const isItemOpen = (id: string, isActive: boolean) =>
    expandedMap[id] !== undefined ? expandedMap[id] : isActive;

  const toggle = (id: string, currentlyOpen: boolean) => {
    setExpandedMap((prev) => ({ ...prev, [id]: !currentlyOpen }));
  };

  function renderGroup(group: AdminNavGroup, itemActive: boolean) {
    const open = isItemOpen(group.id, itemActive);
    const listId = `nav-group-${group.id}`;
    return (
      <li key={group.id}>
        <button
          type="button"
          className={styles.group}
          aria-expanded={open}
          aria-controls={listId}
          onClick={() => toggle(group.id, open)}
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
                    <span className={styles.bullet}>•</span>
                    <span>{adminText(leaf.labelKey)}</span>
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
        <div className={styles.brandIcon} aria-hidden="true">
          <svg width="30" height="30" viewBox="0 0 30 30" fill="none">
            <path
              d="M15 6.5C11.5 3 4 3 2.5 5.5v16.5c2.5 0 8.5 0 12.5 3.5 4-3.5 10-3.5 12.5-3.5V5.5c-1.5-2.5-9-2.5-12.5 1z"
              fill="#1a56db"
            />
            <path d="M15 25.5V6.5" stroke="#1648b8" strokeWidth="1.5" />
            <path
              d="M15 1.5l1.2 2.3 2.6.4-1.9 1.8.4 2.6-2.3-1.2-2.3 1.2.4-2.6-1.9-1.8 2.6-.4L15 1.5z"
              fill="#FBBF24"
            />
          </svg>
        </div>
        <div className={styles.brandText}>
          <p className={styles.name}>{adminText('admin.app.name')}</p>
          <p className={styles.portal}>{adminText('admin.app.portal')}</p>
        </div>
      </div>
      <nav aria-label={adminText('admin.nav.label')}>
        <ul className={styles.list}>
          {ADMIN_NAV.map((item) => {
            const active = item.id === activeId;
            const hasChildren =
              (item.items && item.items.length > 0) ||
              (item.groups && item.groups.length > 0);
            const isOpen = isItemOpen(item.id, active);
            const isCurrent = active && activeSub === null && !hasChildren;

            return (
              <li key={item.id} className={styles.item}>
                <div className={`${styles.row} ${active ? styles.rowActive : ''}`}>
                  <Link
                    href={item.href}
                    className={`${styles.link} ${active ? styles.active : ''}`}
                    aria-current={isCurrent ? 'page' : undefined}
                    onClick={onNavigate}
                  >
                    <span className={styles.linkLeft}>
                      {item.icon ? <Icon name={item.icon} size={20} /> : null}
                      <span>{adminText(item.labelKey)}</span>
                    </span>
                  </Link>
                  {hasChildren ? (
                    <button
                      type="button"
                      className={styles.toggleBtn}
                      aria-label={`Toggle ${adminText(item.labelKey)}`}
                      aria-expanded={isOpen}
                      onClick={() => toggle(item.id, isOpen)}
                    >
                      <Icon name={isOpen ? 'chevronUp' : 'chevronDown'} size={16} />
                    </button>
                  ) : null}
                </div>

                {/* Flat direct sub-items (e.g. Questions -> Mid, Final, Mock, COC Exams) */}
                {item.items && isOpen ? (
                  <ul className={styles.subDirect}>
                    {item.items.map((leaf) => {
                      const isLeafActive = leaf.id === activeSub;
                      return (
                        <li key={leaf.id}>
                          <Link
                            href={leaf.href}
                            className={`${styles.leaf} ${isLeafActive ? styles.leafActive : ''}`}
                            aria-current={isLeafActive ? 'page' : undefined}
                            onClick={onNavigate}
                          >
                            <span className={styles.bullet}>•</span>
                            <span>{adminText(leaf.labelKey)}</span>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                ) : null}

                {/* Grouped sub-items (e.g. Content -> Material, Tests) */}
                {item.groups && isOpen ? (
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
