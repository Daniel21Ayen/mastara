// apps/admin-web/src/middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { decodeSession, SESSION_COOKIE } from '@/core/session/cookie';
import { hasPermission, type AdminRole } from '@mastara/domain';

// Map of route prefixes to required permissions
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

/**
 * Role & Session Guard middleware.
 * 1. Signed-out visitors are sent to /login with `next` query parameter.
 * 2. Signed-in admins navigating to /login are redirected to /dashboard.
 * 3. Enforces route-level permissions per AdminRole; unauthorized users are redirected to /forbidden.
 */
export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const session = decodeSession(request.cookies.get(SESSION_COOKIE)?.value);
  const onLogin = pathname === '/login';

  // 1. Signed-out users trying to access protected pages
  if (!session && !onLogin) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.search = pathname === '/' ? '' : `?next=${encodeURIComponent(pathname + search)}`;
    return NextResponse.redirect(url);
  }

  // 2. Signed-in users on login page
  if (session && onLogin) {
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';
    url.search = '';
    return NextResponse.redirect(url);
  }

  // 3. Permission guard for signed-in admins
  if (session && session.user) {
    const adminRole = (session.user.adminRole || 'SUPER_ADMIN') as AdminRole;

    // Super Admin ('*') has access to all pages
    if (adminRole !== 'SUPER_ADMIN') {
      const match = ROUTE_PERMISSIONS.find((r) => pathname.startsWith(r.prefix));
      if (match) {
        const allowed = hasPermission(adminRole, match.permission);
        if (!allowed) {
          const forbiddenUrl = request.nextUrl.clone();
          forbiddenUrl.pathname = '/forbidden';
          return NextResponse.rewrite(forbiddenUrl);
        }
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
