// apps/mobile/src/modules/progress/screens/ProgressScreen.tsx
import { progressPercent } from '@mastara/domain';
import { ActivityIndicator, View } from 'react-native';

import { useI18n } from '@/core/i18n';
import { accentForKey, createStyles, useTheme } from '@/core/theme';
import { useTimeAgo } from '@/shared/hooks';
import { AppButton, AppText, Card, ListRow, ProgressBar, Screen, ScreenHeader } from '@/shared/ui';

import { useProgress } from '../hooks/useProgress';

export function ProgressScreen() {
  const theme = useTheme();
  const styles = useStyles();
  const { t } = useI18n();
  const timeAgo = useTimeAgo();
  const { data, loading, error, reload } = useProgress();

  return (
    <Screen scroll inTabs>
      <ScreenHeader title={t('nav.progress')} />

      {loading && !data ? <ActivityIndicator color={theme.colors.primary} /> : null}
      {error ? <AppButton label={t('common.retry')} variant="outline" onPress={reload} /> : null}

      {data && data.courses.length === 0 ? <AppText muted>{t('progress.empty')}</AppText> : null}

      {data && data.courses.length > 0 ? (
        <>
          <Card>
            <AppText bold>{t('progress.overall')}</AppText>
            <AppText variant="title" color={theme.accents.emerald.main}>
              {data.percent}%
            </AppText>
            <ProgressBar value={data.percent} accent="emerald" />
            <AppText variant="caption" muted>
              {t('progress.chapters', { done: data.done, total: data.total })}
            </AppText>
          </Card>

          <AppText bold>{t('progress.byCourse')}</AppText>
          <View style={styles.list}>
            {data.courses.map((item) => {
              const percent = progressPercent(item.chaptersDone, item.chaptersTotal);
              return (
                <Card key={item.course.id}>
                  <View style={styles.row}>
                    <AppText bold style={styles.flex}>
                      {item.course.title}
                    </AppText>
                    <AppText bold color={theme.accents[accentForKey(item.course.id)].main}>
                      {percent}%
                    </AppText>
                  </View>
                  <ProgressBar value={percent} accent={accentForKey(item.course.id)} />
                </Card>
              );
            })}
          </View>

          <AppText bold>{t('progress.results')}</AppText>
          {data.results.length === 0 ? <AppText muted>{t('progress.noResults')}</AppText> : null}
          <View style={styles.list}>
            {data.results.map((record) => (
              <ListRow
                key={record.id}
                icon="trophy"
                title={record.title}
                subtitle={`${t('result.score', { correct: record.correct, total: record.total })} · ${timeAgo(record.submittedAt)}`}
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
}));
