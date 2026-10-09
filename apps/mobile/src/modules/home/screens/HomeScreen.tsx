// apps/mobile/src/modules/home/screens/HomeScreen.tsx
import type { Href } from 'expo-router';
import { useRouter } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { useI18n } from '@/core/i18n';
import { useSession } from '@/core/session';
import { useUnreadCount } from '@/modules/notifications';
import { theme } from '@/core/theme';
import { useComingSoon } from '@/shared/hooks';
import { AppButton, AppText, Screen } from '@/shared/ui';

import { CocExamCard } from '../components/CocExamCard';
import { ContinueLearningCard } from '../components/ContinueLearningCard';
import { HomeHeader } from '../components/HomeHeader';
import { QuickCard } from '../components/QuickCard';
import { RecentlyAccessedList } from '../components/RecentlyAccessedList';
import { useHomeData } from '../hooks/useHomeData';

export function HomeScreen() {
  const { t } = useI18n();
  const { user, profile } = useSession();
  const router = useRouter();
  const comingSoon = useComingSoon();
  const unread = useUnreadCount();
  const { data, loading, error, reload } = useHomeData();

  const openCourse = (courseId: string) => router.push(`/course/${courseId}` as Href);

  return (
    <Screen scroll inTabs>
      <HomeHeader
        name={user?.name ?? ''}
        hasUnread={unread > 0}
        onBellPress={() => router.push('/notifications' as Href)}
        onAvatarPress={() => router.push('/profile' as Href)}
      />

      {loading && !data ? <ActivityIndicator color={theme.colors.primary} /> : null}
      {error ? <AppButton label={t('common.retry')} variant="outline" onPress={reload} /> : null}

      {data ? (
        <>
          <ContinueLearningCard data={data.continueLearning} onPress={openCourse} />

          <View style={styles.row}>
            <QuickCard
              icon="course"
              title={t('home.quick.courses')}
              subtitle={t('home.quick.courses.sub', { n: profile?.courseIds.length ?? 0 })}
              onPress={() => router.push('/course' as Href)}
            />
            <QuickCard
              icon="stats"
              title={t('home.quick.stats')}
              subtitle={t('home.quick.stats.sub', { done: data.chaptersDone, total: data.chaptersTotal })}
              onPress={() => router.push('/progress' as Href)}
            />
            <QuickCard
              icon="store"
              title={t('home.quick.store')}
              subtitle={t('home.quick.store.sub', { active: data.activeProducts, pending: data.pendingProducts })}
              alert={data.pendingProducts > 0}
              onPress={() => router.push('/store' as Href)}
            />
          </View>

          <CocExamCard onPress={() => router.push('/coc' as Href)} />

          <RecentlyAccessedList
            items={data.recent}
            onSeeAll={comingSoon}
            onItemPress={(item) => (item.courseId ? openCourse(item.courseId) : comingSoon())}
          />
        </>
      ) : null}

      {!loading && !data && !error ? <AppText muted>{t('home.continue.emptySub')}</AppText> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: theme.spacing.sm },
});
