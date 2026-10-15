// apps/mobile/src/shared/ui/Icon.tsx
import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';

import { useTheme } from '@/core/theme';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

/** The only place that knows which icon library is used. Filled icons are used for tiles so colours read clearly. */
const ICONS = {
  home: 'home',
  course: 'book',
  progress: 'stats-chart',
  profile: 'person',
  bell: 'notifications',
  search: 'search',
  filter: 'options',
  chevron: 'chevron-forward',
  check: 'checkmark',
  close: 'close',
  play: 'play',
  store: 'cart',
  exam: 'ribbon',
  stats: 'bar-chart',
  lock: 'lock-closed',
  back: 'chevron-back',
  module: 'layers',
  note: 'document-text',
  flag: 'flag',
  grid: 'apps',
  trophy: 'trophy',
  language: 'language',
  phone: 'phone-portrait',
  shield: 'shield-checkmark',
  support: 'help-buoy',
  receipt: 'receipt',
  clock: 'time',
  star: 'star',
  quiz: 'help-circle',
  review: 'eye',
  palette: 'color-palette',
  download: 'cloud-download-outline',
  downloaded: 'checkmark-circle',
  trash: 'trash',
} as const satisfies Record<string, IoniconName>;

export type IconName = keyof typeof ICONS;

interface IconProps {
  name: IconName;
  size?: number;
  color?: string;
}

export function Icon({ name, size = 20, color }: IconProps) {
  const theme = useTheme();
  return <Ionicons name={ICONS[name]} size={size} color={color ?? theme.colors.text} accessible={false} />;
}
