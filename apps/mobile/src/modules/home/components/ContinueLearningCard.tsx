// apps/mobile/src/modules/home/components/ContinueLearningCard.tsx
import type { HomeSummary } from '@mastara/contracts';
import { Pressable, StyleSheet, View } from 'react-native';

import { useI18n } from '@/core/i18n';
import { theme } from '@/core/theme';
import { AppText, Icon, ProgressBar } from '@/shared/ui';

interface ContinueLearningCardProps {
  data: HomeSummary['continueLearning'];
  onPress: (courseId: string) => void;
}

export function ContinueLearningCard({ data, onPress }: ContinueLearningCardProps) {
  const { t } = useI18n();

  return (
    <Pressable
      accessibilityRole="button"
      disabled={!data}
      onPress={() => data && onPress(data.courseId)}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.tile}>
        <Icon name="play" color={theme.colors.onPrimary} />
      </View>
      <View style={styles.text}>
        <AppText bold color={theme.colors.onPrimary} variant="bodyLarge">
          {data ? t('home.continue') : t('home.continue.empty')}
        </AppText>
        <AppText variant="caption" color={theme.colors.onPrimaryMuted}>
          {data
            ? `${data.courseTitle} · ${t('home.continue.chapter', { n: data.chapterNumber })}`
            : t('home.continue.emptySub')}
        </AppText>
        {data ? <ProgressBar value={data.percent} tone="onPrimary" /> : null}
      </View>
      {data ? (
        <AppText bold color={theme.colors.onPrimary}>
          {data.percent}%
        </AppText>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  pressed: { opacity: 0.9 },
  tile: {
    width: 48,
    height: 48,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.onPrimarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: { flex: 1, gap: theme.spacing.xs },
});
