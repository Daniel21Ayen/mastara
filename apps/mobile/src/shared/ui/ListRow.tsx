// apps/mobile/src/shared/ui/ListRow.tsx
import { Pressable, View } from 'react-native';
import type { ReactNode } from 'react';

import { createStyles, useTheme } from '@/core/theme';
import type { AccentName } from '@/core/theme';

import { AppText } from './AppText';
import { Icon } from './Icon';
import type { IconName } from './Icon';
import { IconTile } from './IconTile';

interface ListRowProps {
  title: string;
  subtitle?: string;
  icon: IconName;
  /** Colour of the icon tile. Defaults to the icon's own colour. */
  accent?: AccentName;
  onPress?: () => void;
  /** Replaces the chevron, for example a <Badge />. */
  trailing?: ReactNode;
}

/** Card row: icon tile, two text lines and a chevron. */
export function ListRow({ title, subtitle, icon, accent, onPress, trailing }: ListRowProps) {
  const theme = useTheme();
  const styles = useStyles();
  return (
    <Pressable
      accessibilityRole="button"
      disabled={!onPress}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <IconTile icon={icon} accent={accent} />
      <View style={styles.text}>
        <AppText bold>{title}</AppText>
        {subtitle ? (
          <AppText variant="caption" muted>
            {subtitle}
          </AppText>
        ) : null}
      </View>
      {trailing ?? <Icon name="chevron" color={theme.colors.textMuted} />}
    </Pressable>
  );
}

const useStyles = createStyles((theme) => ({
  row: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  pressed: { opacity: 0.85 },
  text: { flex: 1, gap: 2 },
}));
