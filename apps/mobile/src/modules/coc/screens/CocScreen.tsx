// apps/mobile/src/modules/coc/screens/CocScreen.tsx
import type { CocSet } from '@mastara/contracts';
import { canOpenContent } from '@mastara/domain';
import type { Href } from 'expo-router';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { useI18n } from '@/core/i18n';
import { theme } from '@/core/theme';
import { LockedSheet } from '@/modules/access';
import { examResultRepository } from '@/modules/exams';
import type { ExamResultRecord } from '@/modules/exams';
import { useAsync, useTimeAgo } from '@/shared/hooks';
import { AppButton, AppText, Badge, BottomSheet, Card, Icon, ListRow, Screen, TopBar } from '@/shared/ui';

import { useCocSets } from '../hooks/useCocData';

type Sheet = 'sets' | 'rules' | 'results' | 'locked' | null;

/** COC home (opened from the Home card). Independent of Exams: questions come from all of the student's courses. */
export function CocScreen() {
  const { t, language } = useI18n();
  const router = useRouter();
  const timeAgo = useTimeAgo();
  const { sets, paid, hasCourses, loading, error, reload } = useCocSets();
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
        <View style={styles.bannerTile}>
          <Icon name="exam" color={theme.colors.onPrimary} size={26} />
        </View>
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
      {error ? <AppButton label={t('common.retry')} variant="outline" onPress={reload} /> : null}
      {!loading && !hasCourses ? (
        <Card>
          <AppText muted>{t('coc.noCourses')}</AppText>
        </Card>
      ) : null}

      {hasCourses ? (
        <>
          <ListRow icon="play" title={t('coc.start')} subtitle={t('coc.start.sub')} onPress={() => setSheet('sets')} />
          <ListRow icon="note" title={t('coc.instructions')} subtitle={t('coc.instructions.sub')} onPress={() => setSheet('rules')} />
          <ListRow icon="stats" title={t('coc.results')} subtitle={t('coc.results.sub')} onPress={() => setSheet('results')} />
        </>
      ) : null}

      <BottomSheet visible={sheet === 'sets'} title={t('coc.sets')} onClose={() => setSheet(null)} scroll>
        {sets.map((set) => {
          const open = canOpenContent(paid ? 'PAID' : 'FREE_TRIAL', set.isFree);
          return (
            <ListRow
              key={set.id}
              icon={open ? 'exam' : 'lock'}
              title={typeof set.title === 'string' ? set.title : (set.title?.[language] ?? (set.title as any)?.en ?? '')}
              subtitle={t('coc.setMeta', { count: set.questionCount, minutes: set.minutes, courses: set.courseCount })}
              trailing={set.isFree && !paid ? <Badge label={t('exams.sample')} /> : undefined}
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

const styles = StyleSheet.create({
  flex: { flex: 1 },
  banner: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  bannerTile: {
    width: 52,
    height: 52,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.onPrimarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
