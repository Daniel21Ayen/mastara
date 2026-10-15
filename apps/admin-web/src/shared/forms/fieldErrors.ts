// apps/admin-web/src/shared/forms/fieldErrors.ts
import { adminTextFor } from '@/core/i18n';

interface Issue {
  path: readonly PropertyKey[];
  message: string;
}

/** First translated message per field from a Zod error, so each field shows one clear message. */
export function fieldErrors<Field extends string>(
  issues: readonly Issue[],
): Partial<Record<Field, string>> {
  const result: Partial<Record<Field, string>> = {};
  for (const issue of issues) {
    const field = String(issue.path[0]) as Field;
    if (!result[field]) result[field] = adminTextFor(issue.message);
  }
  return result;
}
