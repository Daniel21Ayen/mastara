// apps/mobile/src/modules/exams/components/ExamsTab.tsx
import type { Exam } from '@mastara/contracts';
import { canOpenContent, EXAM_KINDS } from '@mastara/domain';
import type { AccessState, ExamKind } from '@mastara/domain';
import type { TranslationKey } from '@mastara/i18n';
import type { Href } from 'expo-router';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { useI18n } from '@/core/i18n';
import { theme } from '@/core/theme';
import { LockedSheet } from '@/modules/access';
import { AppButton, AppText, Icon, UnderlineTabs } from '@/shared/ui';
import type { UnderlineTabOption } from '@/shared/ui';

import { useExams } from '../hooks/useExams';

import { ExamRow } from './ExamRow';

interface KindText {
  tab: TranslationKey;
  title: TranslationKey;
  subtitle: TranslationKey;
}

const KIND_TEXT: Record<ExamKind, KindText> = {
  MID: { tab: 'exams.tab.mid', title: 'exams.title.mid', subtitle: 'exams.sub.mid' },
  FINAL: { tab: 'exams.tab.final', title: 'exams.title.final', subtitle: 'exams.sub.final' },
  MOCK: { tab: 'exams.tab.mock', title: 'exams.title.mock', subtitle: 'exams.sub.mock' },
};

interface ExamsTabProps {
  courseId: string;
  access: AccessState;
}

/** Course "Exams" tab: lower tabs Mid, Final, Mock. COC is not here: it opens from Home. */
export function ExamsTab({ courseId, access }: ExamsTabProps) {
  const { t } = useI18n();
  const router = useRouter();
  const [kind, setKind] = useState<ExamKind>('MID');
  const [lockedOpen, setLockedOpen] = useState(false);
  const { items, loading, error, reload } = useExams(courseId, kind);

  const options: UnderlineTabOption<ExamKind>[] = EXAM_KINDS.map((value) => ({
    value,
    label: t(KIND_TEXT[value].tab),
  }));

  function openExam(exam: Exam, open: boolean) {
    if (!open) setLockedOpen(true);
    else router.push(`/exam/${exam.id}` as Href);
  }

  return (
    <View style={styles.wrap}>
      <UnderlineTabs options={options} value={kind} onChange={setKind} />

      <View style={styles.intro}>
        <View style={styles.tile}>
          <Icon name="exam" color={theme.colors.primary} />
        </View>
        <View style={styles.text}>
          <AppText variant="bodyLarge" bold>
            {t(KIND_TEXT[kind].title)}
          </AppText>
          <AppText variant="caption" muted>
            {t(KIND_TEXT[kind].subtitle)}
          </AppText>
        </View>
      </View>

      {loading && items.length === 0 ? <ActivityIndicator color={theme.colors.primary} /> : null}
      {error ? <AppButton label={t('common.retry')} variant="outline" onPress={reload} /> : null}
      {!loading && !error && items.length === 0 ? <AppText muted>{t('exams.empty')}</AppText> : null}

      {items.map(({ exam, university }) => (
        <ExamRow
          key={exam.id}
          exam={exam}
          university={university}
          open={canOpenContent(access, exam.isFree)}
          onPress={openExam}
        />
      ))}

      <LockedSheet visible={lockedOpen} onClose={() => setLockedOpen(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: theme.spacing.md },
  intro: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md },
  tile: {
    width: 40,
    height: 40,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: { flex: 1, gap: 2 },
});
