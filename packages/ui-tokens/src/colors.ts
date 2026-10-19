// packages/ui-tokens/src/colors.ts
/**
 * The ONLY four colours in the app. Everything else is derived from these with transparency.
 * Add a new colour here only after the design owner agrees.
 */
export const palette = {
  primary: '#1a56db',
  ink: '#0f172a',
  white: '#ffffff',
  danger: '#b91c1c',
} as const;

function channel(hex: string, index: 0 | 1 | 2): number {
  return parseInt(hex.slice(1 + index * 2, 3 + index * 2), 16);
}

/** Returns `hex` with the given opacity, e.g. withAlpha('#1451c4', 0.1). */
export function withAlpha(hex: string, alpha: number): string {
  return `rgba(${channel(hex, 0)}, ${channel(hex, 1)}, ${channel(hex, 2)}, ${alpha})`;
}

export type ColorScheme = 'light' | 'dark';

/** The same semantic names in both schemes, so no screen needs to know which one is active. */
export interface ColorSet {
  primary: string;
  /** Text and icons ON a primary or accent colour (white in light mode, dark ink in dark mode). */
  onPrimary: string;
  onPrimarySoft: string;
  onPrimaryMuted: string;
  /** Cards, sheets and inputs. */
  surface: string;
  text: string;
  textMuted: string;
  /** The page behind the cards. */
  background: string;
  primarySoft: string;
  border: string;
  danger: string;
  dangerSoft: string;
  overlay: string;
}

/** Light mode. Screens sit on a white root, so tints stay light. */
export const lightColors: ColorSet = {
  primary: palette.primary,
  onPrimary: palette.white,
  onPrimarySoft: withAlpha(palette.white, 0.2),
  onPrimaryMuted: withAlpha(palette.white, 0.8),
  surface: palette.white,
  text: palette.ink,
  textMuted: withAlpha(palette.ink, 0.68),
  background: withAlpha(palette.primary, 0.07),
  primarySoft: withAlpha(palette.primary, 0.12),
  border: withAlpha(palette.primary, 0.28),
  danger: palette.danger,
  dangerSoft: withAlpha(palette.danger, 0.1),
  overlay: withAlpha(palette.ink, 0.5),
};

/** Dark-mode foundations. The brand blue and the error red are lightened so they stay readable on a dark page. */
export const darkPalette = {
  page: '#0b1220',
  card: '#141c2e',
  text: '#e8edf7',
  primary: '#7aa5ff',
  danger: '#ff8a80',
} as const;

/** Dark mode: same names, readable on a dark page. */
export const darkColors: ColorSet = {
  primary: darkPalette.primary,
  onPrimary: darkPalette.page,
  onPrimarySoft: withAlpha(darkPalette.page, 0.2),
  onPrimaryMuted: withAlpha(darkPalette.page, 0.75),
  surface: darkPalette.card,
  text: darkPalette.text,
  textMuted: withAlpha(darkPalette.text, 0.7),
  background: darkPalette.page,
  primarySoft: withAlpha(darkPalette.primary, 0.16),
  border: withAlpha(darkPalette.primary, 0.32),
  danger: darkPalette.danger,
  dangerSoft: withAlpha(darkPalette.danger, 0.14),
  overlay: withAlpha('#000000', 0.62),
};

export function getColors(scheme: ColorScheme): ColorSet {
  return scheme === 'dark' ? darkColors : lightColors;
}

/** Light colours, kept under the old name for code that does not switch themes (tests, the future admin portal). */
export const colors = lightColors;

export type ColorToken = keyof ColorSet;
