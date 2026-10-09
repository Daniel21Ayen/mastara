// apps/mobile/src/modules/home/components/CocExamCard.tsx
import { Pressable, StyleSheet, View } from 'react-native';

import { useI18n } from '@/core/i18n';
import { theme } from '@/core/theme';
import { AppText, Icon } from '@/shared/ui';

export function CocExamCard({ onPress }: { onPress: () => void }) {
  const { t } = useI18n();

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.tile}>
        <Icon name="exam" color={theme.colors.onPrimary} />
      </View>
      <View style={styles.text}>
        <AppText bold>{t('home.coc.title')}</AppText>
        <AppText variant="caption" muted>
          {t('home.coc.sub')}
        </AppText>
      </View>
      <Icon name="chevron" color={theme.colors.primary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.primarySoft,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  pressed: { opacity: 0.85 },
  tile: {
    width: 48,
    height: 48,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: { flex: 1, gap: 2 },
});
