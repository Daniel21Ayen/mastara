// apps/admin-web/src/modules/shell/components/PortalShell.tsx
'use client';

import type { AdminUser } from '@mastara/contracts';
import { usePathname } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import type { ReactNode } from 'react';

import { hasPermission } from '@mastara/domain';
import ForbiddenPage from '@/app/(portal)/forbidden/page';
import { SessionProvider } from '@/core/session';

import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';

import styles from './PortalShell.module.css';

const ROUTE_PERMISSIONS: Array<{ prefix: string; permission: string }> = [
  { prefix: '/students', permission: 'students.read' },
  { prefix: '/catalog', permission: 'catalog.read' },
  { prefix: '/commerce/payments', permission: 'payments.review' },
  { prefix: '/commerce/pricing', permission: 'pricing.read' },
  { prefix: '/content', permission: 'content.write' },
  { prefix: '/scan-to-pdf', permission: 'scans.write' },
  { prefix: '/questions', permission: 'questions.write' },
  { prefix: '/support', permission: 'support.reply' },
  { prefix: '/audit', permission: 'audit.read' },
  { prefix: '/admins', permission: 'admins.manage' },
];

interface PortalShellProps {
  user: AdminUser;
  children: ReactNode;
}

/** Sidebar, top bar and page area. On narrow screens the sidebar is a drawer opened from the top bar. */
export function PortalShell({ user, children }: PortalShellProps) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  const routeGuard = ROUTE_PERMISSIONS.find((r) => pathname.startsWith(r.prefix));
  const isForbidden = Boolean(routeGuard && !hasPermission(user.adminRole, routeGuard.permission));

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
          <main className={styles.content}>{isForbidden ? <ForbiddenPage /> : children}</main>
        </div>
      </div>
    </SessionProvider>
  );
}
