// packages/i18n/src/index.ts
import am from './locales/am.json';
import en from './locales/en.json';

export type Language = 'en' | 'am';
export type TranslationKey = keyof typeof en;
export type TranslationParams = Record<string, string | number>;

export const LANGUAGES: readonly Language[] = ['en', 'am'];
export const DEFAULT_LANGUAGE: Language = 'en';

// Typing `am` as Record<TranslationKey, string> makes the compiler fail if a key is missing.
const amStrict: Record<TranslationKey, string> = am;

export const resources: Record<Language, Record<TranslationKey, string>> = { en, am: amStrict };

/** Replaces {name} placeholders: interpolate('{n} days ago', { n: 2 }) -> '2 days ago'. */
export function interpolate(template: string, params?: TranslationParams): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in params ? String(params[name]) : match,
  );
}
export * from './adminStrings';
