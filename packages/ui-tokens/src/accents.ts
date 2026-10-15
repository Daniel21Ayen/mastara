// packages/ui-tokens/src/accents.ts
import { darkPalette, palette, withAlpha } from './colors';
import type { ColorScheme } from './colors';

/**
 * Accent colours for icons, tiles, course cards and progress bars: every area of the app gets its own colour.
 * They are decoration only. Text stays `ink` or `white`, and errors stay `danger`, so meaning never depends on these.
 * In light mode each `main` is dark enough for a white icon on top (at least 3:1); in dark mode each is light enough for dark ink.
 */
export const ACCENT_NAMES = ['blue', 'violet', 'emerald', 'orange', 'cyan', 'amber', 'fuchsia', 'lime'] as const;
export type CycleAccent = (typeof ACCENT_NAMES)[number];

/** `danger` is available to tiles for error states but is never picked by `accentForKey`. */
export type AccentName = CycleAccent | 'danger';

const LIGHT_MAIN: Record<AccentName, string> = {
  blue: palette.primary,
  violet: '#7c3aed',
  emerald: '#047857',
  orange: '#ea580c',
  cyan: '#0e7490',
  amber: '#b45309',
  fuchsia: '#c026d3',
  lime: '#4d7c0f',
  danger: palette.danger,
};

/** Dark mode: the same hues, lightened. Dark ink on top of them stays readable. */
const DARK_MAIN: Record<AccentName, string> = {
  blue: darkPalette.primary,
  violet: '#a78bfa',
  emerald: '#34d399',
  orange: '#fb923c',
  cyan: '#22d3ee',
  amber: '#fbbf24',
  fuchsia: '#e879f9',
  lime: '#a3e635',
  danger: darkPalette.danger,
};

export interface Accent {
  /** Strong colour: solid tiles, icons on a light tile, progress fill. */
  main: string;
  /** Light tint of the same colour: tile and card backgrounds. */
  soft: string;
  /** Slightly stronger tint: borders and tracks. */
  track: string;
}

function build(main: Record<AccentName, string>, soft: number, track: number): Record<AccentName, Accent> {
  return Object.fromEntries(
    (Object.keys(main) as AccentName[]).map((name) => [
      name,
      { main: main[name], soft: withAlpha(main[name], soft), track: withAlpha(main[name], track) },
    ]),
  ) as Record<AccentName, Accent>;
}

export const lightAccents = build(LIGHT_MAIN, 0.14, 0.24);
export const darkAccents = build(DARK_MAIN, 0.18, 0.32);

/** Light accents, kept under the old name for code that does not switch themes. */
export const accents = lightAccents;

export function getAccents(scheme: ColorScheme): Record<AccentName, Accent> {
  return scheme === 'dark' ? darkAccents : lightAccents;
}

/** The same key always gives the same accent, so a course or topic keeps its colour on every screen and every visit. */
export function accentForKey(key: string): CycleAccent {
  let hash = 0;
  for (let index = 0; index < key.length; index += 1) {
    hash = (hash * 31 + key.charCodeAt(index)) >>> 0;
  }
  return ACCENT_NAMES[hash % ACCENT_NAMES.length] as CycleAccent;
}
