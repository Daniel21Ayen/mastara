// apps/mobile/src/shared/ui/Icon.tsx
import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';

import { theme } from '@/core/theme';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

/** The only place that knows which icon library is used. Add new icons here. */
const ICONS = {
  home: 'home-outline',
  course: 'book-outline',
  progress: 'stats-chart-outline',
  profile: 'person-outline',
  bell: 'notifications-outline',
  search: 'search-outline',
  filter: 'options-outline',
  chevron: 'chevron-forward',
  check: 'checkmark',
  close: 'close',
  play: 'play',
  store: 'cart-outline',
  exam: 'ribbon-outline',
  stats: 'bar-chart-outline',
  lock: 'lock-closed-outline',
  back: 'chevron-back',
  module: 'layers-outline',
  note: 'document-text-outline',
  flag: 'flag-outline',
  grid: 'apps-outline',
} as const satisfies Record<string, IoniconName>;

export type IconName = keyof typeof ICONS;

interface IconProps {
  name: IconName;
  size?: number;
  color?: string;
}

export function Icon({ name, size = 20, color = theme.colors.text }: IconProps) {
  return <Ionicons name={ICONS[name]} size={size} color={color} accessible={false} />;
}
