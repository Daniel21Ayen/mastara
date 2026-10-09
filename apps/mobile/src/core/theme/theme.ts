// apps/mobile/src/core/theme/theme.ts
import { colors, fontFamily, fontSize, minTouchTarget, radius, spacing } from '@mastara/ui-tokens';

export const theme = { colors, fontFamily, fontSize, minTouchTarget, radius, spacing } as const;
export type Theme = typeof theme;
