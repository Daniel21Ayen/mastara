// apps/mobile/src/core/session/routes.ts
import type { SessionStatus } from './deriveStatus';

export const ROUTES = {
  splash: '/',
  login: '/login',
  deviceRegistration: '/device-registration',
  deviceLocked: '/device-locked',
  profileSetup: '/profile-setup',
  home: '/home',
} as const;

export type AppRoute = (typeof ROUTES)[keyof typeof ROUTES];

type OnboardingStatus = Exclude<SessionStatus, 'loading' | 'ready'>;

const ROUTE_FOR_STATUS: Record<OnboardingStatus, AppRoute> = {
  signedOut: ROUTES.login,
  needsDevice: ROUTES.deviceRegistration,
  deviceLocked: ROUTES.deviceLocked,
  needsProfile: ROUTES.profileSetup,
};

/** Screens a student must not stay on once onboarding is complete. */
const ONBOARDING_ROUTES = new Set<string>([
  ROUTES.splash,
  ROUTES.login,
  ROUTES.deviceRegistration,
  ROUTES.deviceLocked,
  ROUTES.profileSetup,
]);

/** Returns where the guard must send the student, or null when the current path is fine. */
export function redirectFor(status: SessionStatus, pathname: string): AppRoute | null {
  if (status === 'loading') return null;
  if (status === 'ready') return ONBOARDING_ROUTES.has(pathname) ? ROUTES.home : null;

  const target = ROUTE_FOR_STATUS[status];
  return pathname === target ? null : target;
}
