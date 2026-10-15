// apps/mobile/src/modules/my-courses/components/CourseCard.tsx
import type { MyCourse } from '@mastara/contracts';
import { Pressable, View } from 'react-native';

import { useI18n } from '@/core/i18n';
import { accentForKey, createStyles, useTheme } from '@/core/theme';
import { AppText, Badge, Icon, LetterTile, ProgressBar } from '@/shared/ui';

import { percentOf } from '../lib/filterCourses';

interface CourseCardProps {
  item: MyCourse;
  onPress: (courseId: string) => void;
}

export function CourseCard({ item, onPress }: CourseCardProps) {
  const theme = useTheme();
  const styles = useStyles();
  const { t } = useI18n();
  const percent = percentOf(item);
  const accent = accentForKey(item.course.id);

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
      <View style={styles.tile}>
        <AppText variant="heading" color={theme.colors.primary}>
          {(typeof item.course.title === 'string' ? item.course.title : ((item.course.title as any)?.en ?? '')).charAt(0)}
        </AppText>
      </View>
      <View style={styles.text}>
        <AppText bold>{item.course.title}</AppText>
        <AppText variant="caption" muted>
          {streamLabel} · {accessLabel}
        </AppText>
        <View style={styles.progress}>
          <View style={styles.bar}>
            <ProgressBar value={percent} accent={accent} />
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
  text: { flex: 1, gap: 2 },
  progress: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, marginTop: theme.spacing.xs },
  bar: { flex: 1 },
}));
