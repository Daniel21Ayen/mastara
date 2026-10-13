// apps/mobile/src/modules/home/components/HomeHeader.tsx
import { Pressable, View } from 'react-native';

import { useI18n } from '@/core/i18n';
import { createStyles, useTheme } from '@/core/theme';
import { AppText, Icon } from '@/shared/ui';

interface HomeHeaderProps {
  name: string;
  hasUnread: boolean;
  onBellPress: () => void;
  onAvatarPress: () => void;
}

export function HomeHeader({ name, hasUnread, onBellPress, onAvatarPress }: HomeHeaderProps) {
  const theme = useTheme();
  const styles = useStyles();
  const { t } = useI18n();
  const firstName = name.trim().split(' ')[0] ?? name;

  return (
    <View style={styles.row}>
      <View style={styles.text}>
        <AppText variant="heading" accessibilityRole="header">
          {t('home.hello', { name: firstName })}
        </AppText>
        <AppText variant="caption" muted>
          {t('home.subtitle')}
        </AppText>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('home.notifications')}
        onPress={onBellPress}
        style={styles.round}
      >
        <Icon name="bell" color={theme.accents.amber.main} size={22} />
        {hasUnread ? <View style={styles.dot} /> : null}
      </Pressable>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('home.profile')}
        onPress={onAvatarPress}
        style={[styles.round, styles.avatar]}
      >
        <AppText bold color={theme.colors.onPrimary}>
          {firstName.charAt(0).toUpperCase()}
        </AppText>
      </Pressable>
    </View>
  );
}

const useStyles = createStyles((theme) => ({
  row: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md },
  text: { flex: 1, gap: 2 },
  round: {
    width: theme.minTouchTarget,
    height: theme.minTouchTarget,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.accents.amber.soft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: { backgroundColor: theme.accents.violet.main },
  dot: {
    position: 'absolute',
    top: 10,
    right: 12,
    width: 9,
    height: 9,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.danger,
  },
}));
