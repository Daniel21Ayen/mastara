import type { MyCourse } from '@mastara/contracts';
import { memo } from 'react';
import { Pressable, View } from 'react-native';

import { useI18n } from '@/core/i18n';
import { accentForKey, createStyles, useTheme } from '@/core/theme';
import { CourseActionButton } from '@/modules/courses/components/CourseActionButton';
import { AppText, Badge, LetterTile, ProgressBar } from '@/shared/ui';

import { percentOf } from '../lib/filterCourses';

interface CourseCardProps {
  item: MyCourse;
  onPress: (courseId: string) => void;
}

export const CourseCard = memo(function CourseCard({ item, onPress }: CourseCardProps) {
  const theme = useTheme();
  const styles = useStyles();
  const { t, language } = useI18n();
  const percent = percentOf(item);
  const rawTitle: unknown = item.course.title;
  const englishTitle =
    typeof rawTitle === 'string' ? rawTitle : ((rawTitle as { en?: string; am?: string } | null)?.en ?? '');
  const title = (language === 'am' && item.course.titleAm) || englishTitle;

  const streamLabel =
    item.course.stream === 'COMMON'
      ? t('courses.filter.common')
      : t(item.course.stream === 'NATURAL' ? 'courses.filter.natural' : 'courses.filter.social');

  const daysRemaining =
    item.daysLeft !== undefined
      ? item.daysLeft
      : item.expiresAt
        ? Math.max(0, Math.ceil((new Date(item.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
        : undefined;

  const accessLabel =
    item.access === 'PAID'
      ? daysRemaining !== undefined
        ? `${t('access.paid')} · ${t('access.daysLeft', { n: daysRemaining })}`
        : t('access.paid')
      : item.access === 'FREE_TRIAL'
        ? t('access.freeTrial')
        : t('access.locked');

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityHint={item.expiresAt ? `Expires ${new Date(item.expiresAt).toLocaleDateString()}` : undefined}
      onPress={() => onPress(item.course.id)}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <LetterTile label={title.charAt(0).toUpperCase()} accent="blue" />
      <View style={styles.text}>
        <AppText bold>{title}</AppText>
        <AppText variant="caption" muted>
          {streamLabel} · {accessLabel}
        </AppText>
        <View style={styles.progress}>
          <View style={styles.bar}>
            <ProgressBar value={percent} accent="blue" />
          </View>
          <AppText variant="caption" muted>
            {percent}%
          </AppText>
        </View>
      </View>

      <View style={styles.actions} onStartShouldSetResponder={() => true}>
        <CourseActionButton course={item.course} compact />
      </View>

      {item.access === 'PAID' ? (
        <Badge label={t('access.paid')} tone="primary" />
      ) : item.access === 'FREE_TRIAL' ? (
        <Badge label={t('access.freeTrial')} tone="muted" />
      ) : (
        <Badge label={t('access.locked')} tone="danger" />
      )}
    </Pressable>
  );
});

const useStyles = createStyles((theme) => ({
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  pressed: { opacity: 0.85 },
  text: { flex: 1, gap: 4 },
  progress: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  bar: { flex: 1 },
  actions: {
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 4,
  },
}));
