// apps/mobile/src/modules/exams/lib/finalizeOverdueExams.ts
import type { Question } from '@mastara/contracts';
import { downtimeMs, elapsedAfterDowntime, isOverdue, scoreExam } from '@mastara/domain';

import { attemptStore } from '@/core/db';
import { getBootId, getUptimeMs } from '@/core/timer';

import { activeExams } from './activeExams';
import { EXAM_ATTEMPT_PREFIX, examQuestionsKey } from './savedExam';
import type { SavedExam } from './savedExam';
import { submitExam } from './submitExam';

/**
 * Submits every saved exam whose time ran out while the student was away, using the answers saved so far.
 * Without this an abandoned exam would sit on the phone forever and never reach the server.
 * Returns how many were submitted.
 */
export async function finalizeOverdueExams(): Promise<number> {
  const saved = await attemptStore.list<SavedExam>(EXAM_ATTEMPT_PREFIX);
  if (saved.length === 0) return 0;

  const now = { wallMs: Date.now(), uptimeMs: await getUptimeMs(), bootId: getBootId() };
  let submitted = 0;

  for (const { key, state } of saved) {
    if (activeExams.has(key)) continue; // its screen is open and will finish it
    if (!state.sittingId || !state.meta || state.session.submitted) {
      await attemptStore.remove(key); // old format or already done: nothing to finish
      continue;
    }

    const durationMs = state.meta.minutes * 60_000;
    const closedFor = downtimeMs(
      { wallMs: state.savedWallMs, uptimeMs: state.savedUptimeMs, bootId: state.savedBootId },
      now,
    );
    const elapsedMs = elapsedAfterDowntime(state.elapsedMs, closedFor, durationMs);
    if (!isOverdue(elapsedMs, durationMs)) continue;

    const questions = await attemptStore.load<Question[]>(examQuestionsKey(state.meta.examId));
    if (!questions) continue; // cannot grade without the questions; the exam screen finishes it when opened

    const score = scoreExam(questions, state.session.answers);
    await submitExam({
      sittingId: state.sittingId,
      startedAt: state.startedAt,
      examId: state.meta.examId,
      title: state.meta.title,
      durationMs,
      elapsedMs,
      answers: state.session.answers,
      reason: 'overdue',
      score: { correct: score.correct, total: score.total },
    });
    await attemptStore.remove(examQuestionsKey(state.meta.examId));
    await attemptStore.remove(key);
    submitted += 1;
  }
  return submitted;
}
