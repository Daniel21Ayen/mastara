// apps/mobile/src/modules/exams/components/ExamFlow.tsx
import type { Question } from '@mastara/contracts';
import { downtimeMs, elapsedAfterDowntime } from '@mastara/domain';
import type { Answer, ExamScore } from '@mastara/domain';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator } from 'react-native';

import { attemptStore } from '@/core/db';
import { useI18n } from '@/core/i18n';
import { newId } from '@/core/sync';
import { useTheme } from '@/core/theme';
import { getBootId, getUptimeMs } from '@/core/timer';
import { AppButton, AppText, BottomSheet, Screen, TopBar } from '@/shared/ui';

import { examAttemptKey, examQuestionsKey } from '../lib/savedExam';
import type { ResumeData, SavedExam, SavedExamMeta, Sitting } from '../lib/savedExam';
import { submitExam } from '../lib/submitExam';

import { ExamInstructions } from './ExamInstructions';
import { ExamResultView } from './ExamResultView';
import { ExamReview } from './ExamReview';
import { ExamRunner } from './ExamRunner';
import type { FinishInfo } from './ExamRunner';

type Phase = 'instructions' | 'running' | 'result' | 'review';

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

/**
 * Instructions, then the timed exam, then the result.
 * Leaving does not stop the clock: the sitting is kept and the time away is counted. The student can come back and
 * continue until time is up; if time ran out while away, the saved answers are submitted.
 */
export function ExamFlow({ examId, title, subtitle, questions, minutes, courseTitles, onExit }: ExamFlowProps) {
  const theme = useTheme();
  const { t } = useI18n();
  const attemptKey = examAttemptKey(examId);
  const [phase, setPhase] = useState<Phase>('instructions');
  const [resume, setResume] = useState<ResumeData | null | undefined>(undefined); // undefined = still looking
  const [score, setScore] = useState<ExamScore | null>(null);
  const [leaveOpen, setLeaveOpen] = useState(false);
  /** Kept in memory after submitting so the student can review the answers. */
  const [reviewAnswers, setReviewAnswers] = useState<Readonly<Record<string, Answer>> | null>(null);
  const [sitting, setSitting] = useState<Sitting | null>(null);
  /** A resumed sitting keeps the time it started with; a new one uses the time the admin has set now. */
  const activeMinutes = resume?.minutes ?? minutes;
  const meta: SavedExamMeta = useMemo(
    () => ({ examId, title, minutes: activeMinutes }),
    [examId, title, activeMinutes],
  );

  // Look for an unfinished exam on the phone and add the time the app was closed.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const saved = await attemptStore.load<SavedExam>(attemptKey);
      if (cancelled) return;
      if (!saved || saved.session.submitted || !saved.sittingId || !saved.meta) {
        if (saved) await attemptStore.remove(attemptKey); // finished, or saved by an older version
        setResume(null);
        return;
      }
      const closedFor = downtimeMs(
        { wallMs: saved.savedWallMs, uptimeMs: saved.savedUptimeMs, bootId: saved.savedBootId },
        { wallMs: Date.now(), uptimeMs: await getUptimeMs(), bootId: getBootId() },
      );
      if (cancelled) return;
      setSitting({ sittingId: saved.sittingId, startedAt: saved.startedAt });
      setResume({
        sittingId: saved.sittingId,
        startedAt: saved.startedAt,
        session: saved.session,
        minutes: saved.meta.minutes,
        elapsedMs: elapsedAfterDowntime(saved.elapsedMs, closedFor, saved.meta.minutes * 60_000),
      });
      setPhase('running');
    })();
    return () => {
      cancelled = true;
    };
  }, [attemptKey]);

  function start() {
    setSitting({ sittingId: newId(), startedAt: new Date().toISOString() });
    setPhase('running');
  }

  async function finish(result: ExamScore, info: FinishInfo) {
    if (!sitting) return;
    setScore(result);
    setReviewAnswers(info.answers);
    setPhase('result');
    await submitExam({
      ...sitting,
      examId,
      title,
      durationMs: activeMinutes * 60_000,
      elapsedMs: info.elapsedMs,
      answers: info.answers,
      reason: info.reason,
      score: { correct: result.correct, total: result.total },
    });
    await attemptStore.remove(examQuestionsKey(examId));
    await attemptStore.remove(attemptKey); // last: if the app dies before this, the sitting is sent again and counted once
  }

  /** Leaving keeps the sitting and its running clock. The sheet says so. */
  function leave() {
    setLeaveOpen(false);
    onExit();
  }

  return (
    <Screen scroll={phase === 'instructions' || phase === 'result'}>
      <TopBar title={title} onBack={phase === 'running' ? () => setLeaveOpen(true) : phase === 'review' ? () => setPhase('result') : onExit} />

      {resume === undefined ? <ActivityIndicator color={theme.colors.primary} /> : null}

      {resume !== undefined && phase === 'instructions' ? (
        <ExamInstructions
          title={title}
          subtitle={subtitle}
          questionCount={questions.length}
          minutes={minutes}
          onStart={start}
        />
      ) : null}

      {phase === 'running' && sitting ? (
        <ExamRunner
          questions={questions}
          minutes={activeMinutes}
          attemptKey={attemptKey}
          resume={resume ?? undefined}
          sitting={sitting}
          meta={meta}
          onFinish={(result, info) => void finish(result, info)}
        />
      ) : null}

      {phase === 'result' && score ? (
        <ExamResultView
          score={score}
          courseTitles={courseTitles}
          onReview={reviewAnswers ? () => setPhase('review') : undefined}
          onBack={onExit}
        />
      ) : null}

      {phase === 'review' && reviewAnswers ? (
        <ExamReview questions={questions} answers={reviewAnswers} onBack={() => setPhase('result')} />
      ) : null}

      <BottomSheet visible={leaveOpen} title={t('exam.leave.title')} onClose={() => setLeaveOpen(false)}>
        <AppText muted>{t('exam.leave.body')}</AppText>
        <AppButton label={t('exam.keep')} onPress={() => setLeaveOpen(false)} />
        <AppButton label={t('exam.leave.confirm')} variant="outline" onPress={leave} />
      </BottomSheet>
    </Screen>
  );
}
