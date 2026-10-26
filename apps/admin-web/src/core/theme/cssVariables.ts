// apps/admin-web/src/core/theme/cssVariables.ts
import * as tokens from '@mastara/ui-tokens';
import { darkColors, darkPalette, fontSize, lightColors, palette, radius, spacing, withAlpha } from '@mastara/ui-tokens';

function kebab(name: string): string {
  return name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
}

function group(prefix: string, values: object, unit = ''): string[] {
  return Object.entries(values).map(
    ([name, value]) => `--${prefix}-${kebab(name)}: ${value}${unit};`,
  );
}

/**
 * Builds :root (light) and [data-theme=dark] rules from `packages/ui-tokens`.
 * Style sheets always use `var(--color-*)` — they never contain a literal colour value.
 */
export function buildCssVariables(): string {
  const lightLines = [
    ...group('color', lightColors),
    `--color-text-soft: ${withAlpha(palette.ink, 0.1)};`,
    `--color-warning: ${palette.warning};`,
    '--color-warning-soft: rgba(245, 158, 11, 0.12);',
    ...group('space', spacing, 'px'),
    ...group('radius', radius, 'px'),
    ...group('font-size', fontSize, 'px'),
    "--font-sans: 'Plus Jakarta Sans', system-ui, -apple-system, 'Segoe UI', sans-serif;",
    '--sidebar-width: 232px;',
    '--topbar-height: 64px;',
  ];

  const darkLines = [
    ...group('color', darkColors),
    `--color-text-soft: ${withAlpha(darkColors.text, 0.12)};`,
    `--color-warning: ${darkPalette.warning};`,
    '--color-warning-soft: rgba(251, 191, 36, 0.16);',
  ];

  return (
    `:root {\n  ${lightLines.join('\n  ')}\n}\n\n` +
    `[data-theme=dark] {\n  ${darkLines.join('\n  ')}\n}`
  );
}

/** @deprecated Use buildCssVariables() which now supports both light and dark. */
export const _tokens = tokens;
