// apps/mobile/src/modules/home/screens/HomeScreen.tsx
import type { Href } from 'expo-router';
import { useRouter } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';

import { useI18n } from '@/core/i18n';
import { useSession } from '@/core/session';
import { useUnreadCount } from '@/modules/notifications';
import { createStyles, useTheme } from '@/core/theme';
import { useComingSoon } from '@/shared/hooks';
import { AppButton, AppText, Card, Screen } from '@/shared/ui';

import { HomeHeader } from '../components/HomeHeader';
import { QuickCard } from '../components/QuickCard';
import { RecentlyAccessedList } from '../components/RecentlyAccessedList';
import { useHomeData } from '../hooks/useHomeData';

export function HomeScreen() {
  const theme = useTheme();
  const styles = useStyles();
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

      <View style={styles.grid}>
        <QuickCard
          icon="course"
          accent="blue"
          title={t('home.quick.courses')}
          subtitle={t('home.quick.courses.sub', { n: profile?.courseIds.length ?? 0 })}
          onPress={() => router.push('/course' as Href)}
        />
        <QuickCard
          icon="stats"
          accent="blue"
          title={t('home.quick.stats')}
          subtitle={t('home.quick.stats.sub', {
            done: data?.chaptersDone ?? 0,
            total: data?.chaptersTotal ?? 0,
          })}
          onPress={() => router.push('/progress' as Href)}
        />
        <QuickCard
          icon="store"
          accent="blue"
          title={t('home.quick.store')}
          subtitle={t('home.quick.store.sub', {
            active: data?.activeProducts ?? 0,
            pending: data?.pendingProducts ?? 0,
          })}
          alert={(data?.pendingProducts ?? 0) > 0}
          onPress={() => router.push('/store' as Href)}
        />
        <QuickCard
          icon="trophy"
          accent="blue"
          title={t('home.coc.title')}
          subtitle={t('home.coc.sub')}
          onPress={() => router.push('/coc' as Href)}
        />
      </View>

      {data?.recent && data.recent.length > 0 ? (
        <RecentlyAccessedList
          items={data.recent}
          onSeeAll={comingSoon}
          onItemPress={(item) => (item.courseId ? openCourse(item.courseId) : comingSoon())}
        />
      ) : (
        <Card>
          <AppText bold>{t('home.empty')}</AppText>
          <AppText muted>{t('home.recent.empty')}</AppText>
          <AppButton
            label={t('mycourses.add')}
            variant="outline"
            onPress={() => router.push('/course' as Href)}
          />
        </Card>
      )}
    </Screen>
  );
}

const useStyles = createStyles((theme) => ({
  // Four cards of the same size: two rows of two.
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm },
  emptyCard: { gap: theme.spacing.sm, marginTop: theme.spacing.md, padding: theme.spacing.md },
}));
