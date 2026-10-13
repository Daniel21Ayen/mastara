// apps/mobile/src/modules/coc/screens/CocScreen.tsx
import type { CocSet } from '@mastara/contracts';
import { canOpenContent } from '@mastara/domain';
import type { Href } from 'expo-router';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { useI18n } from '@/core/i18n';
import { createStyles, useTheme } from '@/core/theme';
import { LockedSheet } from '@/modules/access';
import { examResultRepository } from '@/modules/exams';
import type { ExamResultRecord } from '@/modules/exams';
import { useAsync, useTimeAgo } from '@/shared/hooks';
import { AppText, Badge, BottomSheet, Card, ErrorNotice, IconTile, ListRow, Screen, TopBar } from '@/shared/ui';

import { useCocSets } from '../hooks/useCocData';
import { DownloadButton } from '@/modules/downloads';

import { cocSetDownload } from '../lib/cocSetDownload';

type Sheet = 'sets' | 'rules' | 'results' | 'locked' | null;

/** COC home (opened from the Home card). Independent of Exams: questions come from all of the student's courses. */
export function CocScreen() {
  const theme = useTheme();
  const styles = useStyles();
  const { t, language } = useI18n();
  const router = useRouter();
  const timeAgo = useTimeAgo();
  const { sets, paid, hasCourses, courseIds, loading, error, reload } = useCocSets();
  const [sheet, setSheet] = useState<Sheet>(null);
  const results = useAsync(sheet === 'results' ? () => examResultRepository.list() : null, [sheet]);

  function openSet(set: CocSet) {
    if (!canOpenContent(paid ? 'PAID' : 'FREE_TRIAL', set.isFree)) {
      setSheet('locked');
      return;
    }
    setSheet(null);
    router.push(`/coc/${set.id}` as Href);
  }

  return (
    <Screen scroll>
      <TopBar title={t('coc.title')} onBack={() => router.back()} />

      <View style={styles.banner}>
        <IconTile icon="trophy" accent="amber" solid size={52} />
        <View style={styles.flex}>
          <AppText bold variant="bodyLarge" color={theme.colors.onPrimary}>
            {t('coc.title')}
          </AppText>
          <AppText variant="caption" color={theme.colors.onPrimaryMuted}>
            {t('coc.banner')}
          </AppText>
        </View>
      </View>

      {loading ? <ActivityIndicator color={theme.colors.primary} /> : null}
      {error ? <ErrorNotice error={error} onRetry={reload} /> : null}
      {!loading && !hasCourses ? (
        <Card>
          <AppText muted>{t('coc.noCourses')}</AppText>
        </Card>
      ) : null}

      {hasCourses ? (
        <>
          <ListRow icon="play" accent="emerald" title={t('coc.start')} subtitle={t('coc.start.sub')} onPress={() => setSheet('sets')} />
          <ListRow icon="note" accent="cyan" title={t('coc.instructions')} subtitle={t('coc.instructions.sub')} onPress={() => setSheet('rules')} />
          <ListRow icon="stats" accent="amber" title={t('coc.results')} subtitle={t('coc.results.sub')} onPress={() => setSheet('results')} />
        </>
      ) : null}

      <BottomSheet visible={sheet === 'sets'} title={t('coc.sets')} onClose={() => setSheet(null)} scroll>
        {sets.map((set) => {
          const open = canOpenContent(paid ? 'PAID' : 'FREE_TRIAL', set.isFree);
          return (
            <ListRow
              key={set.id}
              icon={open ? 'trophy' : 'lock'}
              accent={open ? 'fuchsia' : 'danger'}
              title={set.title[language]}
              subtitle={t('coc.setMeta', { count: set.questionCount, minutes: set.minutes, courses: set.courseCount })}
              trailing={
                <View style={styles.trailing}>
                  {open ? <DownloadButton unit={cocSetDownload(set, courseIds)} /> : null}
                  {set.isFree && !paid ? <Badge label={t('exams.sample')} /> : null}
                </View>
              }
              onPress={() => openSet(set)}
            />
          );
        })}
      </BottomSheet>

      <BottomSheet visible={sheet === 'rules'} title={t('coc.instructions')} onClose={() => setSheet(null)} scroll>
        <AppText muted>{t('coc.rules')}</AppText>
        <AppText muted>{t('exam.rule.save')}</AppText>
        <AppText muted>{t('exam.rule.flag')}</AppText>
        <AppText muted>{t('exam.rule.auto')}</AppText>
      </BottomSheet>

      <BottomSheet visible={sheet === 'results'} title={t('coc.results')} onClose={() => setSheet(null)} scroll>
        {(results.data ?? []).length === 0 && !results.loading ? <AppText muted>{t('coc.noResults')}</AppText> : null}
        {(results.data ?? []).map((record: ExamResultRecord) => (
          <ListRow
            key={record.id}
            icon="stats"
            title={record.title}
            subtitle={`${t('result.score', { correct: record.correct, total: record.total })} · ${timeAgo(record.submittedAt)}`}
          />
        ))}
      </BottomSheet>

      <LockedSheet visible={sheet === 'locked'} onClose={() => setSheet(null)} />
    </Screen>
  );
}

const useStyles = createStyles((theme) => ({
  flex: { flex: 1 },
  trailing: { flexDirection: 'row', alignItems: 'center' },
  banner: {
    backgroundColor: theme.accents.fuchsia.main,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
}));
