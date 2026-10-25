// packages/domain/src/access/resolveOpen.ts
import type { AccessState } from '../constants/learning';
import { canOpenContent } from './canOpenContent';

export type OpenResolution = 'LOCKED' | 'OPEN_LOCAL' | 'OPEN_ONLINE' | 'NEEDS_INTERNET';

export interface ResolveOpenParams {
  access: AccessState;
  isFree: boolean;
  isDownloaded: boolean;
  isOnline: boolean;
}

/**
 * Single pure access resolution rule shared by mobile and server:
 * Wraps canOpenContent.
 *
 * 1. If not allowed by canOpenContent -> LOCKED
 * 2. If allowed:
 *    - If downloaded locally -> OPEN_LOCAL
 *    - If not downloaded, but online -> OPEN_ONLINE
 *    - If not downloaded and offline -> NEEDS_INTERNET
 */
export function resolveOpen({
  access,
  isFree,
  isDownloaded,
  isOnline,
}: ResolveOpenParams): OpenResolution {
  if (!canOpenContent(access, isFree)) {
    return 'LOCKED';
  }

  if (isDownloaded) {
    return 'OPEN_LOCAL';
  }

  if (isOnline) {
    return 'OPEN_ONLINE';
  }

  return 'NEEDS_INTERNET';
}
