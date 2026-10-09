// apps/mobile/src/modules/my-courses/components/CourseCard.tsx
import type { MyCourse } from '@mastara/contracts';
import { Pressable, StyleSheet, View } from 'react-native';

import { useI18n } from '@/core/i18n';
import { theme } from '@/core/theme';
import { AppText, Badge, Icon, ProgressBar } from '@/shared/ui';

import { percentOf } from '../lib/filterCourses';

interface CourseCardProps {
  item: MyCourse;
  onPress: (courseId: string) => void;
}

export function CourseCard({ item, onPress }: CourseCardProps) {
  const { t } = useI18n();
  const percent = percentOf(item);

  const streamLabel =
    item.course.stream === 'COMMON'
      ? t('courses.filter.common')
      : t(item.course.stream === 'NATURAL' ? 'courses.filter.natural' : 'courses.filter.social');

  const accessLabel =
    item.access === 'PAID'
      ? item.daysLeft !== undefined
        ? `${t('access.paid')} · ${t('access.daysLeft', { n: item.daysLeft })}`
        : t('access.paid')
      : item.access === 'FREE_TRIAL'
        ? t('access.freeTrial')
        : t('access.locked');

  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => onPress(item.course.id)}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.tile}>
        <AppText variant="heading" color={theme.colors.primary}>
          {item.course.title.charAt(0)}
        </AppText>
      </View>
      <View style={styles.text}>
        <AppText bold>{item.course.title}</AppText>
        <AppText variant="caption" muted>
          {streamLabel} · {accessLabel}
        </AppText>
        <View style={styles.progress}>
          <View style={styles.bar}>
            <ProgressBar value={percent} />
          </View>
          <AppText variant="caption" muted>
            {percent}%
          </AppText>
        </View>
      </View>
      {item.access === 'LOCKED' ? (
        <Badge label={t('access.locked')} tone="danger" />
      ) : (
        <Icon name="chevron" color={theme.colors.textMuted} />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  pressed: { opacity: 0.85 },
  tile: {
    width: 48,
    height: 48,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: { flex: 1, gap: 2 },
  progress: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, marginTop: theme.spacing.xs },
  bar: { flex: 1 },
});
