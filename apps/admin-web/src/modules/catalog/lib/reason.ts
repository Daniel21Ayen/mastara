// apps/admin-web/src/modules/catalog/lib/reason.ts
import { reasonSchema } from '@mastara/contracts';
import { needsReasonToChange } from '@mastara/domain';
import type { CatalogStatus } from '@mastara/domain';

import { adminTextFor } from '@/core/i18n';

/** True when saving `next` over `saved` takes something away from students, so a reason is required. */
export const reasonRequired = (saved: CatalogStatus | undefined, next: CatalogStatus): boolean =>
  saved !== undefined && needsReasonToChange(saved, next);

/** Message to show under the reason box, or undefined when the reason is fine or not required. */
export function reasonProblem(required: boolean, reason: string): string | undefined {
  if (!required) return undefined;
  const parsed = reasonSchema.safeParse(reason);
  return parsed.success
    ? undefined
    : adminTextFor(parsed.error.issues[0]?.message ?? 'validation.reason');
}
