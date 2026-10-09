// apps/mobile/src/modules/courses/components/CourseHeader.tsx
import type { MyCourse } from '@mastara/contracts';
import { progressPercent } from '@mastara/domain';
import { StyleSheet, View } from 'react-native';

import { useI18n } from '@/core/i18n';
import { theme } from '@/core/theme';
import { AppText, ProgressBar } from '@/shared/ui';

export function CourseHeader({ item }: { item: MyCourse }) {
  const { t } = useI18n();
  const percent = progressPercent(item.chaptersDone, item.chaptersTotal);

  return (
    <View style={styles.wrap}>
      <ProgressBar value={percent} />
      <AppText variant="caption" muted>
        {t('course.percentDone', { n: percent })}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: theme.spacing.xs },
});
