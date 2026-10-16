// apps/admin-web/src/core/i18n/adminText.ts
import { adminStrings, interpolate } from '@mastara/i18n';
import type { AdminTranslationKey, TranslationParams } from '@mastara/i18n';

/** English text for a key; works in server and client components. */
export function adminText(key: AdminTranslationKey, params?: TranslationParams): string {
  return interpolate(adminStrings[key], params);
}

/**
 * Text for a key that arrives as a plain string (for example a validation message from `packages/contracts`).
 * Falls back to the key itself so a missing translation is visible instead of blank.
 */
export function adminTextFor(key: string, params?: TranslationParams): string {
  const template = (adminStrings as Record<string, string | undefined>)[key];
  return template === undefined ? key : interpolate(template, params);
}
