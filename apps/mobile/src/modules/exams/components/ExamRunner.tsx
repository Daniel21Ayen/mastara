// apps/mobile/src/modules/exams/components/ExamRunner.tsx
import type { Question } from '@mastara/contracts';
import type { ExamScore } from '@mastara/domain';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Pressable, StyleSheet, View } from 'react-native';

import { useI18n } from '@/core/i18n';
import { theme } from '@/core/theme';
import { attemptStore } from '@/core/db';
import { getUptimeMs } from '@/core/timer';
import { QuestionView } from '@/modules/assessment';
import { AppButton, AppText, BottomSheet, Card, Icon, ProgressBar } from '@/shared/ui';

import { useExamSession } from '../hooks/useExamSession';
import { useExamTimer } from '../hooks/useExamTimer';

import type { ResumeData, SavedExam } from '../lib/savedExam';

import { ExamTimerBadge } from './ExamTimerBadge';
import { QuestionPalette } from './QuestionPalette';

interface ExamRunnerProps {
  questions: Question[];
  minutes: number;
  /** Where this sitting is saved on the phone. */
  attemptKey: string;
  /** Present when an unfinished exam is being resumed. */
  resume?: ResumeData;
  onFinish: (score: ExamScore) => void;
}

/** The running exam: timer, one question at a time, flags, the All Questions palette and submit. */
export function ExamRunner({ questions, minutes, attemptKey, resume, onFinish }: ExamRunnerProps) {
  const { t, language } = useI18n();
  const session = useExamSession(questions, resume?.session);
  const timer = useExamTimer(minutes * 60_000, resume?.elapsedMs ?? 0);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const finished = useRef(false);
  const latest = useRef({ state: session.state, elapsedMs: timer.elapsedMs });
  latest.current = { state: session.state, elapsedMs: timer.elapsedMs };

  // Save the sitting on the phone after every answer, every 5 seconds and when the app goes to the background.
  const persist = useCallback(async () => {
    if (finished.current) return;
    const uptime = await getUptimeMs();
    if (finished.current) return;
    const saved: SavedExam = {
      session: latest.current.state,
      elapsedMs: latest.current.elapsedMs,
      savedWallMs: Date.now(),
      savedUptimeMs: uptime,
    };
    await attemptStore.save(attemptKey, saved);
  }, [attemptKey]);

  useEffect(() => {
    void persist();
  }, [session.state, persist]);

  useEffect(() => {
    const interval = setInterval(() => void persist(), 5000);
    const subscription = AppState.addEventListener('change', (state) => state !== 'active' && void persist());
    return () => {
      clearInterval(interval);
      subscription.remove();
    };
  }, [persist]);

  const { question } = session;
  const left = session.total - session.answered;

  function submit() {
    if (finished.current) return;
    finished.current = true;
    setConfirmOpen(false);
    setPaletteOpen(false);
    session.submit();
    onFinish(session.score());
  }

  // The exam submits by itself when time runs out.
  useEffect(() => {
    if (timer.expired) submit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timer.expired]);

  if (!question) return null;

  return (
    <View style={styles.wrap}>
      <View style={styles.info}>
        <View style={styles.flex}>
          <AppText variant="caption" muted>
            {t('practice.progress', { current: session.state.index + 1, total: session.total })}
          </AppText>
          <AppText variant="caption" muted>
            {t('exam.answered', { done: session.answered, total: session.total })}
          </AppText>
        </View>
        <ExamTimerBadge remainingMs={timer.remainingMs} />
      </View>
      <ProgressBar value={(session.answered / session.total) * 100} />

      <Card>
        <QuestionView
          question={question}
          lang={language}
          answer={session.answer}
          checked={false}
          correct={undefined}
          onChoose={session.choose}
          onText={session.setText}
        />
      </Card>

      <Pressable
        accessibilityRole="button"
        accessibilityState={{ selected: session.flagged }}
        onPress={session.toggleFlag}
        style={styles.flag}
      >
        <Icon name="flag" color={session.flagged ? theme.colors.danger : theme.colors.textMuted} />
        <AppText bold color={session.flagged ? theme.colors.danger : theme.colors.textMuted}>
          {session.flagged ? t('exam.flagged') : t('exam.flag')}
        </AppText>
      </Pressable>

      <View style={styles.row}>
        <View style={styles.flex}>
          <AppButton label={t('practice.previous')} variant="outline" disabled={session.isFirst} onPress={() => session.move(-1)} />
        </View>
        <View style={styles.flex}>
          <AppButton label={t('practice.next')} variant="outline" disabled={session.isLast} onPress={() => session.move(1)} />
        </View>
      </View>
      <View style={styles.row}>
        <View style={styles.flex}>
          <AppButton label={t('exam.allQuestions')} variant="outline" onPress={() => setPaletteOpen(true)} />
        </View>
        <View style={styles.flex}>
          <AppButton label={t('exam.submit')} onPress={() => setConfirmOpen(true)} />
        </View>
      </View>

      <BottomSheet visible={paletteOpen} title={t('exam.allQuestions')} onClose={() => setPaletteOpen(false)} scroll>
        <QuestionPalette
          cells={session.cells}
          onSelect={(index) => {
            session.goto(index);
            setPaletteOpen(false);
          }}
        />
      </BottomSheet>

      <BottomSheet visible={confirmOpen} title={t('exam.submit.title')} onClose={() => setConfirmOpen(false)}>
        <AppText muted>{left > 0 ? t('exam.submit.body', { left }) : t('exam.submit.bodyAll')}</AppText>
        <AppButton label={t('exam.submit.confirm')} onPress={submit} />
        <AppButton label={t('exam.keep')} variant="outline" onPress={() => setConfirmOpen(false)} />
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: theme.spacing.md },
  info: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md },
  flex: { flex: 1 },
  row: { flexDirection: 'row', gap: theme.spacing.sm },
  flag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    minHeight: theme.minTouchTarget,
  },
});
