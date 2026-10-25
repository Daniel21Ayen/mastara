// apps/mobile/src/modules/my-courses/screens/MyCoursesScreen.tsx
import type { CourseTab } from '@mastara/domain';
import type { Href } from 'expo-router';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, FlatList, View } from 'react-native';

import { useI18n } from '@/core/i18n';
import { useSession } from '@/core/session';
import { createStyles, useTheme } from '@/core/theme';
import { AppButton, AppText, Card, ScreenHeader, UnderlineTabs, Screen } from '@/shared/ui';
import type { UnderlineTabOption } from '@/shared/ui';

import { AddCoursesSheet } from '../components/AddCoursesSheet';
import { CourseCard } from '../components/CourseCard';
import { CourseFilterSheet } from '../components/CourseFilterSheet';
import { CourseSearchBar } from '../components/CourseSearchBar';
import { useMyCourses } from '../hooks/useMyCourses';

export function MyCoursesScreen() {
  const theme = useTheme();
  const styles = useStyles();
  const { t } = useI18n();
  const { profile } = useSession();
  const router = useRouter();
  const courses = useMyCourses();
  const [filterOpen, setFilterOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);

  const tabs: UnderlineTabOption<CourseTab>[] = [
    { value: 'ALL', label: t('mycourses.tab.all') },
    { value: 'ONGOING', label: t('mycourses.tab.ongoing') },
    { value: 'COMPLETED', label: t('mycourses.tab.completed') },
  ];

  const header = (
    <View style={styles.header}>
      <ScreenHeader title={t('mycourses.title')} />
      <CourseSearchBar
        value={courses.filters.query}
        onChangeText={(query) => courses.setFilters((prev) => ({ ...prev, query }))}
        activeFilters={courses.activeFilters}
        onFilterPress={() => setFilterOpen(true)}
      />
      <UnderlineTabs
        options={tabs}
        value={courses.filters.tab}
        onChange={(tab) => courses.setFilters((prev) => ({ ...prev, tab }))}
      />
    </View>
  );

  const empty = courses.loading ? (
    <ActivityIndicator color={theme.colors.primary} />
  ) : courses.error ? (
    <View style={styles.gap}>
      <AppText muted>{t('error.offline')}</AppText>
      <AppButton label={t('common.retry')} variant="outline" onPress={courses.reload} />
    </View>
  ) : courses.total === 0 ? (
    <Card>
      <AppText bold>{t('mycourses.empty.none')}</AppText>
      <AppText muted>{t('home.empty')}</AppText>
      <AppButton label={t('mycourses.add')} onPress={() => setAddOpen(true)} />
    </Card>
  ) : (
    <View style={styles.gap}>
      <AppText muted>{t('mycourses.empty.match')}</AppText>
      <AppButton label={t('mycourses.clear')} variant="outline" onPress={courses.clearFilters} />
    </View>
  );

  return (
    <Screen inTabs>
      <FlatList
        data={courses.visible}
        keyExtractor={(item) => item.course.id}
        renderItem={({ item }) => (
          <CourseCard item={item} onPress={(id) => router.push(`/course/${id}` as Href)} />
        )}
        ListHeaderComponent={header}
        ListEmptyComponent={empty}
        ListFooterComponent={<AppButton label={t('mycourses.add')} variant="outline" onPress={() => setAddOpen(true)} />}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        initialNumToRender={10}
        windowSize={5}
        maxToRenderPerBatch={10}
        removeClippedSubviews={true}
      />

      <CourseFilterSheet
        visible={filterOpen}
        filters={courses.filters}
        onApply={(next) => courses.setFilters((prev) => ({ ...prev, ...next }))}
        onClose={() => setFilterOpen(false)}
      />
      {profile ? <AddCoursesSheet visible={addOpen} profile={profile} onClose={() => setAddOpen(false)} /> : null}
    </Screen>
  );
}

const useStyles = createStyles((theme) => ({
  header: { gap: theme.spacing.md, paddingBottom: theme.spacing.md },
  list: { paddingBottom: theme.spacing.lg },
  separator: { height: theme.spacing.sm },
  gap: { gap: theme.spacing.sm },
  emptyCard: { gap: theme.spacing.sm, padding: theme.spacing.lg, marginTop: theme.spacing.md },
}));
