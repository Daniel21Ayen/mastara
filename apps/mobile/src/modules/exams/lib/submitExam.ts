// apps/mobile/src/modules/exams/lib/submitExam.ts
import type { ExamSubmission, SubmittedAnswer } from '@mastara/contracts';
import { hasAnswer } from '@mastara/domain';
import type { Answer, ExamSubmitReason } from '@mastara/domain';

import { outbox } from '@/core/sync';

import { examResultRepository } from '../repo/examResult.repository';

export interface SubmitExamInput {
  sittingId: string;
  startedAt: string;
  examId: string;
  title: string;
  durationMs: number;
  elapsedMs: number;
  answers: Readonly<Record<string, Answer>>;
  reason: ExamSubmitReason;
  /** The score shown on the phone. The server grades again from the answers. */
  score: { correct: number; total: number };
}

function toSubmittedAnswers(answers: Readonly<Record<string, Answer>>): Record<string, SubmittedAnswer> {
  const result: Record<string, SubmittedAnswer> = {};
  for (const [questionId, answer] of Object.entries(answers)) {
    if (!hasAnswer(answer)) continue; // blank questions are not sent
    result[questionId] =
      answer.kind === 'choice'
        ? { kind: 'choice', optionIds: [...answer.optionIds] }
        : { kind: 'text', text: answer.text };
  }
  return result;
}

/**
 * Stores the result and queues the full sitting for upload. The caller removes the saved sitting AFTER this returns,
 * so a crash in between means the sitting is submitted again with the same `sittingId` (counted once, here and on the server).
 */
export async function submitExam(input: SubmitExamInput): Promise<void> {
  const submittedAt = new Date().toISOString();

  await examResultRepository.save({
    id: input.sittingId,
    title: input.title,
    correct: input.score.correct,
    total: input.score.total,
    submittedAt,
  });

  const submission: ExamSubmission = {
    sittingId: input.sittingId,
    examId: input.examId,
    title: input.title,
    answers: toSubmittedAnswers(input.answers),
    reason: input.reason,
    durationMs: input.durationMs,
    elapsedMs: Math.round(input.elapsedMs),
    startedAt: input.startedAt,
    submittedAt,
    provisional: input.score,
  };
  await outbox.enqueue('EXAM_SUBMITTED', submission);
}
