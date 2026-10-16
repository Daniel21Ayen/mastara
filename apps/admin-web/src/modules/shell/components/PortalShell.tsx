// apps/admin-web/src/modules/shell/components/PortalShell.tsx
'use client';

import type { AdminUser } from '@mastara/contracts';
import { usePathname } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import type { ReactNode } from 'react';

import { SessionProvider } from '@/core/session';

import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';

import styles from './PortalShell.module.css';

interface PortalShellProps {
  user: AdminUser;
  children: ReactNode;
}

/** Sidebar, top bar and page area. On narrow screens the sidebar is a drawer opened from the top bar. */
export function PortalShell({ user, children }: PortalShellProps) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  // Close the drawer when the page changes.
  useEffect(() => setMenuOpen(false), [pathname]);

  // Escape closes the drawer.
  useEffect(() => {
    if (!menuOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [menuOpen]);

  return (
    <SessionProvider user={user}>
      <div className={styles.shell}>
        <aside id="portal-sidebar" className={`${styles.sidebar} ${menuOpen ? styles.open : ''}`}>
          <Sidebar onNavigate={() => setMenuOpen(false)} />
        </aside>
        {menuOpen ? (
          <div className={styles.backdrop} aria-hidden="true" onClick={() => setMenuOpen(false)} />
        ) : null}
        <div className={styles.main}>
          <Suspense>
            <Topbar menuOpen={menuOpen} onToggleMenu={() => setMenuOpen((open) => !open)} />
          </Suspense>
          <main className={styles.content}>{children}</main>
        </div>
      </div>
    </SessionProvider>
  );
}
