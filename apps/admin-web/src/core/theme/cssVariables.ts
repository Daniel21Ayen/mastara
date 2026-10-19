// apps/admin-web/src/core/theme/cssVariables.ts
import * as tokens from '@mastara/ui-tokens';
import { fontSize, palette, radius, spacing, withAlpha } from '@mastara/ui-tokens';

/**
 * The student app's light/dark refactor (R2) replaced the single `colors` object with `lightColors` and
 * `darkColors` (same names). The portal is light only, so it reads `lightColors` when it exists and
 * falls back to the older `colors`. This keeps one source of colours for both apps.
 */
const named = tokens as unknown as Record<string, Record<string, string> | undefined>;
const colors: Record<string, string> = named.lightColors ?? named.colors ?? {};

function kebab(name: string): string {
  return name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
}

function group(prefix: string, values: Record<string, string | number>, unit = ''): string[] {
  return Object.entries(values).map(
    ([name, value]) => `--${prefix}-${kebab(name)}: ${value}${unit};`,
  );
}

/**
 * Builds the `:root` rule from `packages/ui-tokens`, so the web portal uses exactly the same four
 * colours as the app. Style sheets use `var(--color-primary)` and never type a colour value.
 */
export function buildCssVariables(): string {
  const lines = [
    ...group('color', colors),
    `--color-text-soft: ${withAlpha(palette.ink, 0.1)};`,
    '--color-primary-hover: #1e40af;',
    '--color-surface-subtle: #f8fafc;',
    '--color-border-subtle: #e2e8f0;',
    ...group('space', spacing, 'px'),
    ...group('radius', radius, 'px'),
    ...group('font-size', fontSize, 'px'),
    "--font-sans: 'Plus Jakarta Sans', system-ui, -apple-system, 'Segoe UI', sans-serif;",
    '--sidebar-width: 232px;',
    '--topbar-height: 64px;',
  ];
  return `:root {\n  ${lines.join('\n  ')}\n}`;
}
