// apps/mobile/src/modules/my-courses/screens/MyCoursesScreen.tsx
import type { MyCourse } from '@mastara/contracts';
import type { CourseTab } from '@mastara/domain';
import { FlashList } from '@shopify/flash-list';
import type { Href } from 'expo-router';
import { useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

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
  const { t, language } = useI18n();
  const { profile } = useSession();
  const router = useRouter();
  const courses = useMyCourses();
  const isGuest = courses.isGuest;
  const [filterOpen, setFilterOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);

  const tabs: UnderlineTabOption<CourseTab>[] = useMemo(
    () => [
      { value: 'ALL', label: t('mycourses.tab.all') },
      { value: 'ONGOING', label: t('mycourses.tab.ongoing') },
      { value: 'COMPLETED', label: t('mycourses.tab.completed') },
    ],
    [t],
  );

  const header = useMemo(
    () => (
      <View style={styles.header}>
        <ScreenHeader title={isGuest
          ? (language === 'am' ? 'ሁሉም ኮርሶች' : 'Course Catalog')
          : t('mycourses.title')} />

        {/* Guest promotional banner */}
        {isGuest ? (
          <View style={styles.guestBanner}>
            <AppText bold>
              {language === 'am' ? '🔒 ሙሉ ዝግጅት ይፈልጋሉ?' : '🔒 Want full access?'}
            </AppText>
            <AppText variant="caption" muted>
              {language === 'am'
                ? 'ነጻ ኮርሶችን ያንብቡ። ሁሉንም ይዘቶች ለማነብ ቦርሳ ይግዙ።'
                : 'Free courses are open. Purchase a bundle to unlock all paid content.'}
            </AppText>
            <AppButton
              label={language === 'am' ? 'ኮርስ ቦርሳ ይግዙ' : 'Buy a Course Bundle'}
              variant="primary"
              onPress={() => router.push('/store')}
            />
          </View>
        ) : null}

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
    ),
    [courses.activeFilters, courses.filters.query, courses.filters.tab, courses.setFilters, isGuest, language, router, styles.guestBanner, styles.header, t, tabs],
  );

  const empty = useMemo(() => {
    if (courses.loading) {
      return <ActivityIndicator color={theme.colors.primary} />;
    }
    if (courses.error) {
      return (
        <View style={styles.gap}>
          <AppText muted>{t('error.offline')}</AppText>
          <AppButton label={t('common.retry')} variant="outline" onPress={courses.reload} />
        </View>
      );
    }
    if (courses.total === 0 && !isGuest) {
      return (
        <Card>
          <AppText bold>{t('mycourses.empty.none')}</AppText>
          <AppText muted>{t('home.empty')}</AppText>
          <AppButton label={t('mycourses.add')} onPress={() => setAddOpen(true)} />
        </Card>
      );
    }
    if (courses.total === 0 && isGuest) {
      return (
        <Card>
          <AppText bold>{language === 'am' ? 'ምንም ኮርስ አልተገኘም' : 'No courses found'}</AppText>
          <AppText muted>{language === 'am' ? 'ለሁሉም ኮርሶች ቦርሳ ይግዙ' : 'Purchase a bundle to unlock all courses'}</AppText>
          <AppButton label={language === 'am' ? 'ኮርስ ይግዙ' : 'Buy a Course Bundle'} onPress={() => router.push('/store')} />
        </Card>
      );
    }
    return (
      <View style={styles.gap}>
        <AppText muted>{t('mycourses.empty.match')}</AppText>
        <AppButton label={t('mycourses.clear')} variant="outline" onPress={courses.clearFilters} />
      </View>
    );
  }, [courses.error, courses.loading, courses.total, courses.clearFilters, courses.reload, isGuest, language, styles.gap, t, theme.colors.primary]);

  const handlePressCourse = useCallback(
    (id: string) => {
      router.push(`/course/${id}` as Href);
    },
    [router],
  );

  const keyExtractor = useCallback((item: MyCourse) => item.course.id, []);

  const renderItem = useCallback(
    ({ item }: { item: MyCourse }) => <CourseCard item={item} onPress={handlePressCourse} />,
    [handlePressCourse],
  );

  const renderSeparator = useCallback(() => <View style={styles.separator} />, [styles.separator]);

  const footer = useMemo(
    () => (
      <AppButton
        label={t('mycourses.add')}
        variant="outline"
        onPress={() => setAddOpen(true)}
      />
    ),
    [t],
  );

  return (
    <Screen inTabs>
      <FlashList
        data={courses.visible}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        ListHeaderComponent={header}
        ListEmptyComponent={empty}
        ListFooterComponent={courses.total > 0 ? footer : null}
        ItemSeparatorComponent={renderSeparator}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
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
  guestBanner: {
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.primarySoft,
    borderColor: theme.colors.primary,
    borderWidth: 1,
    borderRadius: 12,
    padding: theme.spacing.md,
  },
}));

