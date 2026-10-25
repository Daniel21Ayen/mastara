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
  course: 'blue',
  progress: 'blue',
  profile: 'blue',
  bell: 'blue',
  search: 'blue',
  filter: 'blue',
  chevron: 'blue',
  check: 'blue',
  close: 'danger',
  play: 'blue',
  store: 'blue',
  exam: 'blue',
  stats: 'blue',
  lock: 'blue',
  back: 'blue',
  module: 'blue',
  note: 'blue',
  flag: 'blue',
  grid: 'blue',
  trophy: 'blue',
  language: 'blue',
  phone: 'blue',
  shield: 'blue',
  support: 'blue',
  receipt: 'blue',
  clock: 'blue',
  star: 'blue',
  quiz: 'blue',
  review: 'blue',
  palette: 'blue',
  download: 'blue',
  downloaded: 'blue',
  trash: 'danger',
  sync: 'blue',
  wifi: 'blue',
  wifiOff: 'blue',
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
  const isLockNeutral = icon === 'lock' && !accent && !solid;
  const colour = theme.accents[accent ?? ICON_ACCENT[icon]];

  const bgColor = isLockNeutral
    ? theme.colors.borderSubtle
    : solid
      ? colour.main
      : colour.soft;

  const iconColor = isLockNeutral
    ? theme.colors.textMuted
    : solid
      ? theme.colors.onPrimary
      : colour.main;

  return (
    <View
      style={[
        styles.tile,
        {
          width: size,
          height: size,
          borderRadius: round ? theme.radius.pill : theme.radius.md,
          backgroundColor: bgColor,
        },
      ]}
    >
      <Icon name={icon} size={Math.round(size * 0.5)} color={iconColor} />
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
