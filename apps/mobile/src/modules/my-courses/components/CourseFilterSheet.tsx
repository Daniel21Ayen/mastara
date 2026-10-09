// apps/mobile/src/modules/my-courses/components/CourseFilterSheet.tsx
import { ACCESS_STATES } from '@mastara/domain';
import type { AccessState, Stream } from '@mastara/domain';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { useI18n } from '@/core/i18n';
import { theme } from '@/core/theme';
import { AppButton, AppText, BottomSheet, ChipGroup } from '@/shared/ui';
import type { ChipOption } from '@/shared/ui';

import type { CourseFilters } from '../lib/filterCourses';

interface CourseFilterSheetProps {
  visible: boolean;
  filters: CourseFilters;
  onApply: (next: Pick<CourseFilters, 'streams' | 'access'>) => void;
  onClose: () => void;
}

function toggle<T>(list: readonly T[], value: T): T[] {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
}

export function CourseFilterSheet({ visible, filters, onApply, onClose }: CourseFilterSheetProps) {
  const { t } = useI18n();
  const [streams, setStreams] = useState<readonly Stream[]>(filters.streams);
  const [access, setAccess] = useState<readonly AccessState[]>(filters.access);

  // Start from the applied filters each time the sheet opens.
  useEffect(() => {
    if (visible) {
      setStreams(filters.streams);
      setAccess(filters.access);
    }
  }, [visible, filters.streams, filters.access]);

  const streamOptions: ChipOption<Stream>[] = [
    { value: 'NATURAL', label: t('courses.filter.natural') },
    { value: 'SOCIAL', label: t('courses.filter.social') },
    { value: 'COMMON', label: t('courses.filter.common') },
  ];
  const accessLabels: Record<AccessState, string> = {
    PAID: t('access.paid'),
    FREE_TRIAL: t('access.freeTrial'),
    LOCKED: t('access.locked'),
  };
  const accessOptions: ChipOption<AccessState>[] = ACCESS_STATES.map((value) => ({ value, label: accessLabels[value] }));

  return (
    <BottomSheet visible={visible} title={t('mycourses.filter.title')} onClose={onClose}>
      <View style={styles.group}>
        <AppText bold>{t('mycourses.filter.stream')}</AppText>
        <ChipGroup options={streamOptions} selected={streams} onToggle={(v) => setStreams((prev) => toggle(prev, v))} />
      </View>
      <View style={styles.group}>
        <AppText bold>{t('mycourses.filter.access')}</AppText>
        <ChipGroup options={accessOptions} selected={access} onToggle={(v) => setAccess((prev) => toggle(prev, v))} />
      </View>
      <View style={styles.actions}>
        <View style={styles.flex}>
          <AppButton
            label={t('common.clearAll')}
            variant="outline"
            onPress={() => {
              setStreams([]);
              setAccess([]);
            }}
          />
        </View>
        <View style={styles.flex}>
          <AppButton
            label={t('common.apply')}
            onPress={() => {
              onApply({ streams, access });
              onClose();
            }}
          />
        </View>
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  group: { gap: theme.spacing.sm },
  actions: { flexDirection: 'row', gap: theme.spacing.sm },
  flex: { flex: 1 },
});
