// packages/i18n/src/adminStrings.ts
import adminEn from './admin/en.json';

/**
 * Admin portal text. The portal is English only (the SRS asks for English with Amharic content fields),
 * so there is no Amharic copy. `src/index.ts` needs ONE line: export * from './adminStrings';
 */
export type AdminTranslationKey = keyof typeof adminEn;
export const adminStrings: Record<AdminTranslationKey, string> = adminEn;
