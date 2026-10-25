import type { MyCourse } from '@mastara/contracts';
import { progressPercent } from '@mastara/domain';
import type { Href } from 'expo-router';
import { useRouter } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';

import { useI18n } from '@/core/i18n';
import { createStyles, useTheme } from '@/core/theme';
import type { ExamResultRecord } from '@/modules/exams/repo/examResult.repository';
import { useTimeAgo } from '@/shared/hooks';
import { AppButton, AppText, Badge, Card, ListRow, ProgressBar, Screen, ScreenHeader } from '@/shared/ui';

import { useProgress } from '../hooks/useProgress';

export function ProgressScreen() {
  const theme = useTheme();
  const styles = useStyles();
  const { t } = useI18n();
  const router = useRouter();
  const timeAgo = useTimeAgo();
  const { data, loading, error, reload } = useProgress();

  return (
    <Screen scroll inTabs>
      <ScreenHeader title={t('nav.progress')} />

      {loading && !data ? <ActivityIndicator color={theme.colors.primary} /> : null}
      {error ? <AppButton label={t('common.retry')} variant="outline" onPress={reload} /> : null}

      {data && data.courses.length === 0 ? (
        <Card>
          <AppText bold>{t('progress.empty')}</AppText>
          <AppText muted>{t('home.empty')}</AppText>
          <AppButton
            label={t('mycourses.add')}
            variant="outline"
            onPress={() => router.push('/course' as Href)}
          />
        </Card>
      ) : null}

      {data && data.courses.length > 0 ? (
        <>
          <Card>
            <AppText bold>{t('progress.overall')}</AppText>
            <AppText variant="title" color={theme.colors.primary}>
              {data.percent}%
            </AppText>
            <ProgressBar value={data.percent} accent="blue" />
            <AppText variant="caption" muted>
              {t('progress.chapters', { done: data.done, total: data.total })}
            </AppText>
          </Card>

          <AppText bold>{t('progress.byCourse')}</AppText>
          <View style={styles.list}>
            {data.courses.map((item: MyCourse) => {
              const percent = progressPercent(item.chaptersDone, item.chaptersTotal);
              return (
                <Card key={item.course.id}>
                  <View style={styles.row}>
                    <AppText bold style={styles.flex}>
                      {item.course.title}
                    </AppText>
                    <AppText bold color={theme.colors.primary}>
                      {percent}%
                    </AppText>
                  </View>
                  <ProgressBar value={percent} accent="blue" />
                </Card>
              );
            })}
          </View>

          <AppText bold>{t('progress.results')}</AppText>
          {data.results.length === 0 ? <AppText muted>{t('progress.noResults')}</AppText> : null}
          <View style={styles.list}>
            {data.results.map((record: ExamResultRecord) => (
              <ListRow
                key={record.id}
                icon="trophy"
                title={record.title}
                subtitle={`${t('result.score', { correct: record.correct, total: record.total })} · ${timeAgo(record.submittedAt)}`}
                trailing={
                  <Badge
                    label={t('exam.result.statusSynced')}
                    tone="primary"
                  />
                }
              />
            ))}
          </View>
        </>
      ) : null}
    </Screen>
  );
}

const useStyles = createStyles((theme) => ({
  list: { gap: theme.spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md },
  flex: { flex: 1 },
  emptyCard: { gap: theme.spacing.sm, padding: theme.spacing.lg, marginTop: theme.spacing.md },
}));
