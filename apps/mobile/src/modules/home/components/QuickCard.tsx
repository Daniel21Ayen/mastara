// apps/mobile/src/modules/home/components/QuickCard.tsx
import { Pressable, View } from 'react-native';

import { createStyles, useTheme } from '@/core/theme';
import type { AccentName } from '@/core/theme';
import { AppText, IconTile } from '@/shared/ui';
import type { IconName } from '@/shared/ui';

interface QuickCardProps {
  icon: IconName;
  accent: AccentName;
  title: string;
  subtitle: string;
  onPress: () => void;
  /** Small red dot, for example when a payment needs attention. */
  alert?: boolean;
}

export function QuickCard({ icon, accent = 'blue', title, subtitle, onPress, alert = false }: QuickCardProps) {
  const theme = useTheme();
  const styles = useStyles();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.tile}>
        <IconTile icon={icon} accent={accent} solid={false} />
        {alert ? <View style={styles.dot} /> : null}
      </View>
      <AppText bold variant="caption">
        {title}
      </AppText>
      <AppText variant="caption" muted>
        {subtitle}
      </AppText>
    </Pressable>
  );
}

const useStyles = createStyles((theme) => ({
  card: {
    flexGrow: 1,
    flexBasis: '45%',
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    gap: theme.spacing.xs,
  },
  pressed: { opacity: 0.85 },
  tile: { alignSelf: 'flex-start', marginBottom: theme.spacing.xs },
  dot: {
    position: 'absolute',
    top: -3,
    right: -3,
    width: 10,
    height: 10,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.danger,
  },
}));
