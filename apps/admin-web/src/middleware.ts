// apps/admin-web/src/middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { decodeSession, SESSION_COOKIE } from '@/core/session/cookie';

/**
 * Role guard. Signed-out visitors go to /login (and come back to the page they asked for);
 * signed-in admins never see the login page. Only an ADMIN session passes `decodeSession`.
 */
export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const session = decodeSession(request.cookies.get(SESSION_COOKIE)?.value);
  const onLogin = pathname === '/login';

  if (!session && !onLogin) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.search = pathname === '/' ? '' : `?next=${encodeURIComponent(pathname + search)}`;
    return NextResponse.redirect(url);
  }

  if (session && onLogin) {
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';
    url.search = '';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
