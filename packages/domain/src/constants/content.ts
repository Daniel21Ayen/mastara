// packages/domain/src/constants/content.ts
export const CONTENT_KINDS = ['MODULE', 'NOTE'] as const;
export type ContentKind = (typeof CONTENT_KINDS)[number];

/** Language a bilingual record is shown in. One record holds both languages. */
export const CONTENT_LANGS = ['en', 'am'] as const;
export type ContentLang = (typeof CONTENT_LANGS)[number];
