// apps/mobile/src/core/theme/theme.ts
import {
  accentForKey,
  fontFamily,
  fontSize,
  getAccents,
  getColors,
  minTouchTarget,
  radius,
  spacing,
} from '@mastara/ui-tokens';
import type { Accent, AccentName, ColorScheme, ColorSet } from '@mastara/ui-tokens';

/** Everything a component needs to draw itself. Colours follow the scheme; spacing, radius and type do not. */
export interface Theme {
  scheme: ColorScheme;
  colors: ColorSet;
  accents: Record<AccentName, Accent>;
  fontFamily: typeof fontFamily;
  fontSize: typeof fontSize;
  minTouchTarget: typeof minTouchTarget;
  radius: typeof radius;
  spacing: typeof spacing;
}

function build(scheme: ColorScheme): Theme {
  return {
    scheme,
    colors: getColors(scheme),
    accents: getAccents(scheme),
    fontFamily,
    fontSize,
    minTouchTarget,
    radius,
    spacing,
  };
}

/** Both themes are built once, so a theme object keeps the same identity between renders. */
export const themes: Record<ColorScheme, Theme> = { light: build('light'), dark: build('dark') };

/** The same key (a course or topic ID) always gives the same accent colour. */
export { accentForKey };
export type { AccentName, ColorScheme };
