// apps/admin-web/src/shared/ui/RowMenu.tsx
'use client';

import { useEffect, useId, useRef, useState } from 'react';

import { Icon } from './Icon';
import styles from './RowMenu.module.css';

export interface RowMenuItem {
  label: string;
  onSelect: () => void;
}

interface RowMenuProps {
  /** Names the menu button, for example "Actions for Key concepts". */
  label: string;
  items: readonly RowMenuItem[];
}

/** The "⋮" menu at the end of a row. Escape or a click outside closes it. */
export function RowMenu({ label, items }: RowMenuProps) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return undefined;
    const close = (event: MouseEvent | KeyboardEvent) => {
      if (event instanceof KeyboardEvent) {
        if (event.key === 'Escape') setOpen(false);
      } else if (root.current && !root.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', close);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', close);
    };
  }, [open]);

  return (
    <div className={styles.root} ref={root}>
      <button
        type="button"
        className={styles.button}
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen((current) => !current)}
      >
        <Icon name="dots" />
      </button>
      {open ? (
        <ul id={menuId} className={styles.menu} role="menu">
          {items.map((item) => (
            <li key={item.label} role="none">
              <button
                type="button"
                role="menuitem"
                className={styles.item}
                onClick={() => {
                  setOpen(false);
                  item.onSelect();
                }}
              >
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
