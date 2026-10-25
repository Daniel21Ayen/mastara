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
  success: '#16a34a',
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
  primaryHover: string;
  /** Text and icons ON a primary or accent colour (white in light mode, dark ink in dark mode). */
  onPrimary: string;
  onPrimarySoft: string;
  onPrimaryMuted: string;
  /** Cards, sheets and inputs. */
  surface: string;
  surfaceSubtle: string;
  text: string;
  textMuted: string;
  textFaint: string;
  /** The page behind the cards. */
  background: string;
  primarySoft: string;
  border: string;
  borderSubtle: string;
  danger: string;
  dangerSoft: string;
  success: string;
  successSoft: string;
  overlay: string;
  sidebar: string;
  onSidebar: string;
  onSidebarMuted: string;
  onSidebarSubtle: string;
}

/** Light mode. Aligned with the Admin Portal for 100% design consistency. */
export const lightColors: ColorSet = {
  primary: palette.primary,
  primaryHover: withAlpha(palette.primary, 0.9),
  onPrimary: palette.white,
  onPrimarySoft: withAlpha(palette.white, 0.2),
  onPrimaryMuted: withAlpha(palette.white, 0.8),
  surface: palette.white,
  surfaceSubtle: withAlpha(palette.ink, 0.02),
  text: palette.ink,
  textMuted: withAlpha(palette.ink, 0.68),
  textFaint: withAlpha(palette.ink, 0.38),
  background: withAlpha(palette.ink, 0.03),
  primarySoft: withAlpha(palette.primary, 0.1),
  border: withAlpha(palette.ink, 0.12),
  borderSubtle: withAlpha(palette.ink, 0.06),
  danger: palette.danger,
  dangerSoft: withAlpha(palette.danger, 0.1),
  success: palette.success,
  successSoft: withAlpha(palette.success, 0.12),
  overlay: withAlpha(palette.ink, 0.5),
  sidebar: palette.ink,
  onSidebar: palette.white,
  onSidebarMuted: withAlpha(palette.white, 0.75),
  onSidebarSubtle: withAlpha(palette.white, 0.55),
};

/** Dark-mode foundations. The brand blue and the error red are lightened so they stay readable on a dark page. */
export const darkPalette = {
  page: '#0b1220',
  card: '#141c2e',
  text: '#e8edf7',
  primary: '#7aa5ff',
  danger: '#ff8a80',
  success: '#4ade80',
} as const;

/** Dark mode: same names, readable on a dark page. */
export const darkColors: ColorSet = {
  primary: darkPalette.primary,
  primaryHover: withAlpha(darkPalette.primary, 0.85),
  onPrimary: darkPalette.page,
  onPrimarySoft: withAlpha(darkPalette.page, 0.2),
  onPrimaryMuted: withAlpha(darkPalette.page, 0.75),
  surface: darkPalette.card,
  surfaceSubtle: withAlpha(darkPalette.card, 0.6),
  text: darkPalette.text,
  textMuted: withAlpha(darkPalette.text, 0.7),
  textFaint: withAlpha(darkPalette.text, 0.4),
  background: darkPalette.page,
  primarySoft: withAlpha(darkPalette.primary, 0.16),
  border: withAlpha(darkPalette.text, 0.14),
  borderSubtle: withAlpha(darkPalette.text, 0.08),
  danger: darkPalette.danger,
  dangerSoft: withAlpha(darkPalette.danger, 0.14),
  success: darkPalette.success,
  successSoft: withAlpha(darkPalette.success, 0.16),
  overlay: withAlpha('#000000', 0.62),
  sidebar: darkPalette.page,
  onSidebar: darkPalette.text,
  onSidebarMuted: withAlpha(darkPalette.text, 0.75),
  onSidebarSubtle: withAlpha(darkPalette.text, 0.55),
};

export function getColors(scheme: ColorScheme): ColorSet {
  return scheme === 'dark' ? darkColors : lightColors;
}

/** Light colours, kept under the old name for code that does not switch themes (tests, the future admin portal). */
export const colors = lightColors;

export type ColorToken = keyof ColorSet;
