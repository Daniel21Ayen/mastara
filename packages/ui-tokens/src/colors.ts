// packages/ui-tokens/src/colors.ts
/**
 * The ONLY four colours in the app. Everything else is derived from these with transparency.
 * Add a new colour here only after the design owner agrees.
 */
export const palette = {
  primary: '#1451c4',
  ink: '#0f1b33',
  white: '#ffffff',
  danger: '#b42318',
} as const;

function channel(hex: string, index: 0 | 1 | 2): number {
  return parseInt(hex.slice(1 + index * 2, 3 + index * 2), 16);
}

/** Returns `hex` with the given opacity, e.g. withAlpha('#1451c4', 0.1). */
export function withAlpha(hex: string, alpha: number): string {
  return `rgba(${channel(hex, 0)}, ${channel(hex, 1)}, ${channel(hex, 2)}, ${alpha})`;
}

/** Semantic names used by components. Screens sit on a white root, so tints stay light. */
export const colors = {
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
} as const;

export type ColorToken = keyof typeof colors;
