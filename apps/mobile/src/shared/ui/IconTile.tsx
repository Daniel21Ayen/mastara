// apps/mobile/src/shared/ui/IconTile.tsx
import { View } from 'react-native';

import { createStyles, useTheme } from '@/core/theme';
import type { AccentName } from '@/core/theme';

import { AppText } from './AppText';
import { Icon } from './Icon';
import type { IconName } from './Icon';

/** Each icon has its own colour unless a screen picks another (for example a course colour). */
export const ICON_ACCENT: Record<IconName, AccentName> = {
  home: 'blue',
  course: 'violet',
  progress: 'emerald',
  profile: 'cyan',
  bell: 'amber',
  search: 'blue',
  filter: 'blue',
  chevron: 'blue',
  check: 'emerald',
  close: 'danger',
  play: 'orange',
  store: 'orange',
  exam: 'amber',
  stats: 'emerald',
  lock: 'danger',
  back: 'blue',
  module: 'cyan',
  note: 'blue',
  flag: 'orange',
  grid: 'lime',
  trophy: 'fuchsia',
  language: 'violet',
  phone: 'cyan',
  shield: 'emerald',
  support: 'lime',
  receipt: 'orange',
  clock: 'amber',
  star: 'amber',
  quiz: 'cyan',
  review: 'fuchsia',
  palette: 'orange',
  download: 'cyan',
  downloaded: 'emerald',
  trash: 'danger',
  sync: 'blue',
  wifi: 'emerald',
  wifiOff: 'amber',
};

interface IconTileProps {
  icon: IconName;
  /** Colour of the tile. Defaults to the icon's own colour. */
  accent?: AccentName;
  /** Solid colour with a white icon (headline cards) or a light tint with a coloured icon (list rows). */
  solid?: boolean;
  /** Width and height of the tile. */
  size?: number;
  /** Round instead of rounded square. */
  round?: boolean;
}

export function IconTile({ icon, accent, solid = false, size = 44, round = false }: IconTileProps) {
  const theme = useTheme();
  const styles = useStyles();
  const colour = theme.accents[accent ?? ICON_ACCENT[icon]];

  return (
    <View
      style={[
        styles.tile,
        {
          width: size,
          height: size,
          borderRadius: round ? theme.radius.pill : theme.radius.md,
          backgroundColor: solid ? colour.main : colour.soft,
        },
      ]}
    >
      <Icon name={icon} size={Math.round(size * 0.5)} color={solid ? theme.colors.onPrimary : colour.main} />
    </View>
  );
}

interface LetterTileProps {
  /** One or two letters, for example a course or university initial. */
  label: string;
  accent: AccentName;
  size?: number;
  round?: boolean;
}

/** A solid coloured tile with a white letter: course initials, university logos. */
export function LetterTile({ label, accent, size = 48, round = false }: LetterTileProps) {
  const theme = useTheme();
  const styles = useStyles();
  return (
    <View
      style={[
        styles.tile,
        {
          width: size,
          height: size,
          borderRadius: round ? theme.radius.pill : theme.radius.md,
          backgroundColor: theme.accents[accent].main,
        },
      ]}
    >
      <AppText bold color={theme.colors.onPrimary} variant="bodyLarge">
        {label}
      </AppText>
    </View>
  );
}

const useStyles = createStyles((theme) => ({
  tile: { alignItems: 'center', justifyContent: 'center' },
}));
