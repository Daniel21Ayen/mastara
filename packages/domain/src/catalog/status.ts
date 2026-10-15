// packages/domain/src/catalog/status.ts
import type { CatalogStatus } from '../constants/admin';

export type StatusChange = 'NONE' | 'PUBLISH' | 'UNPUBLISH';

export function statusChange(from: CatalogStatus, to: CatalogStatus): StatusChange {
  if (from === to) return 'NONE';
  return to === 'PUBLISHED' ? 'PUBLISH' : 'UNPUBLISH';
}

/** Taking something away from students needs a reason; publishing does not. */
export function needsReasonToChange(from: CatalogStatus, to: CatalogStatus): boolean {
  return statusChange(from, to) === 'UNPUBLISH';
}
