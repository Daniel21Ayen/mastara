// apps/mobile/src/modules/exams/components/ExamFlow.tsx
import type { Question } from '@mastara/contracts';
import { downtimeMs } from '@mastara/domain';
import type { ExamScore } from '@mastara/domain';
import { useEffect, useState } from 'react';
import { ActivityIndicator } from 'react-native';

import { attemptStore } from '@/core/db';
import { useI18n } from '@/core/i18n';
import { outbox } from '@/core/sync';
import { theme } from '@/core/theme';
import { getUptimeMs } from '@/core/timer';
import { AppButton, AppText, BottomSheet, Screen, TopBar } from '@/shared/ui';

import { examAttemptKey } from '../lib/savedExam';
import type { ResumeData, SavedExam } from '../lib/savedExam';
import { examResultRepository } from '../repo/examResult.repository';

import { ExamInstructions } from './ExamInstructions';
import { ExamResultView } from './ExamResultView';
import { ExamRunner } from './ExamRunner';

type Phase = 'instructions' | 'running' | 'result';

interface ExamFlowProps {
  /** Identifies this exam for saving and resuming (an exam ID or a COC set ID). */
  examId: string;
  title: string;
  subtitle?: string;
  questions: Question[];
  minutes: number;
  /** Course names for the per-course breakdown (COC). */
  courseTitles?: Record<string, string>;
  onExit: () => void;
}

/** Instructions, then the timed exam, then the result. An unfinished exam resumes where it stopped. */
export function ExamFlow({ examId, title, subtitle, questions, minutes, courseTitles, onExit }: ExamFlowProps) {
  const { t } = useI18n();
  const attemptKey = examAttemptKey(examId);
  const [phase, setPhase] = useState<Phase>('instructions');
  const [resume, setResume] = useState<ResumeData | null | undefined>(undefined); // undefined = still looking
  const [score, setScore] = useState<ExamScore | null>(null);
  const [leaveOpen, setLeaveOpen] = useState(false);

  // Look for an unfinished exam on the phone and add the time the app was closed.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const saved = await attemptStore.load<SavedExam>(attemptKey);
      if (cancelled) return;
      if (!saved || saved.session.submitted) {
        setResume(null);
        return;
      }
      const closedFor = downtimeMs(
        { wallMs: saved.savedWallMs, uptimeMs: saved.savedUptimeMs },
        { wallMs: Date.now(), uptimeMs: await getUptimeMs() },
      );
      if (cancelled) return;
      setResume({ session: saved.session, elapsedMs: Math.min(minutes * 60_000, saved.elapsedMs + closedFor) });
      setPhase('running');
    })();
    return () => {
      cancelled = true;
    };
  }, [attemptKey, minutes]);

  async function finish(result: ExamScore) {
    setScore(result);
    setPhase('result');
    await attemptStore.remove(attemptKey);

    const record = {
      id: `${Date.now()}`,
      title,
      correct: result.correct,
      total: result.total,
      submittedAt: new Date().toISOString(),
    };
    await examResultRepository.save(record);
    await outbox.enqueue('EXAM_SUBMITTED', { ...record, examId }); // sent to the server when online
  }

  /** Leaving on purpose gives up the sitting, so nothing is left to resume. */
  async function leave() {
    await attemptStore.remove(attemptKey);
    onExit();
  }

  return (
    <Screen scroll>
      <TopBar title={title} onBack={phase === 'running' ? () => setLeaveOpen(true) : onExit} />

      {resume === undefined ? <ActivityIndicator color={theme.colors.primary} /> : null}

      {resume !== undefined && phase === 'instructions' ? (
        <ExamInstructions
          title={title}
          subtitle={subtitle}
          questionCount={questions.length}
          minutes={minutes}
          onStart={() => setPhase('running')}
        />
      ) : null}

      {phase === 'running' ? (
        <ExamRunner
          questions={questions}
          minutes={minutes}
          attemptKey={attemptKey}
          resume={resume ?? undefined}
          onFinish={(result) => void finish(result)}
        />
      ) : null}

      {phase === 'result' && score ? <ExamResultView score={score} courseTitles={courseTitles} onBack={onExit} /> : null}

      <BottomSheet visible={leaveOpen} title={t('exam.leave.title')} onClose={() => setLeaveOpen(false)}>
        <AppText muted>{t('exam.leave.body')}</AppText>
        <AppButton label={t('exam.keep')} onPress={() => setLeaveOpen(false)} />
        <AppButton label={t('exam.leave.confirm')} variant="outline" onPress={() => void leave()} />
      </BottomSheet>
    </Screen>
  );
}
