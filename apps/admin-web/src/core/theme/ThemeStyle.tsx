// apps/admin-web/src/core/theme/ThemeStyle.tsx
import { buildCssVariables } from './cssVariables';

/** Puts the design tokens on the page as CSS variables. Rendered once in the root layout. */
export function ThemeStyle() {
  return <style dangerouslySetInnerHTML={{ __html: buildCssVariables() }} />;
}
