// apps/mobile/src/modules/course-list/components/CoursePicker.tsx
import type { StudentStream } from '@mastara/domain';
import { StyleSheet, View } from 'react-native';

import { useI18n } from '@/core/i18n';
import { theme } from '@/core/theme';
import { AppButton, AppText, Badge, SegmentedControl, SelectableRow } from '@/shared/ui';
import type { SegmentOption } from '@/shared/ui';

import { useCoursePicker } from '../hooks/useCoursePicker';
import type { PickerFilter } from '../hooks/useCoursePicker';

interface CoursePickerProps {
  semesterId: string;
  stream: StudentStream;
  selectedIds: readonly string[];
  onChange: (ids: string[]) => void;
}

function toggle(ids: readonly string[], id: string): string[] {
  return ids.includes(id) ? ids.filter((current) => current !== id) : [...ids, id];
}

export function CoursePicker({ semesterId, stream, selectedIds, onChange }: CoursePickerProps) {
  const { t } = useI18n();
  const { visible, filter, setFilter, loading, error, reload } = useCoursePicker({ semesterId, stream });

  const filterOptions: SegmentOption<PickerFilter>[] = [
    { value: 'ALL', label: t('courses.filter.all') },
    { value: 'STREAM', label: t(stream === 'NATURAL' ? 'courses.filter.natural' : 'courses.filter.social') },
    { value: 'COMMON', label: t('courses.filter.common') },
  ];

  return (
    <View style={styles.wrap}>
      <SegmentedControl options={filterOptions} value={filter} onChange={setFilter} />

      {error ? <AppButton label={t('common.retry')} variant="outline" onPress={reload} /> : null}
      {loading ? <AppText muted>{t('common.loading')}</AppText> : null}
      {!loading && !error && visible.length === 0 ? <AppText muted>{t('courses.empty')}</AppText> : null}

      {visible.map((course) => (
        <SelectableRow
          key={course.id}
          title={course.title}
          description={`${course.code} · ${course.stream === 'COMMON' ? t('courses.filter.common') : t(course.stream === 'NATURAL' ? 'courses.filter.natural' : 'courses.filter.social')}`}
          selected={selectedIds.includes(course.id)}
          onToggle={() => onChange(toggle(selectedIds, course.id))}
          trailing={<Badge label={t('courses.freeTrial')} />}
        />
      ))}

      <AppText muted style={styles.count}>
        {selectedIds.length} {t('courses.selected')}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: theme.spacing.sm },
  count: { textAlign: 'center' },
});
