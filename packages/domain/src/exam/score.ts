// packages/domain/src/exam/score.ts
import { gradeAnswer } from '../quiz/grade';
import type { Answer, GradableQuestion } from '../quiz/grade';

export type ScorableQuestion = GradableQuestion & { id: string; courseId?: string };

export interface ScoreLine {
  correct: number;
  total: number;
}

export interface ExamScore extends ScoreLine {
  /** Per-course scores, for exams that mix courses (COC). Empty when questions carry no course. */
  byCourse: Record<string, ScoreLine>;
}

/** Unanswered questions count as incorrect. */
export function scoreExam(
  questions: readonly ScorableQuestion[],
  answers: Readonly<Record<string, Answer>>,
): ExamScore {
  const byCourse: Record<string, ScoreLine> = {};
  let correct = 0;

  for (const question of questions) {
    const answer = answers[question.id];
    const isCorrect = answer !== undefined && gradeAnswer(question, answer);
    if (isCorrect) correct += 1;

    if (question.courseId) {
      const line = byCourse[question.courseId] ?? { correct: 0, total: 0 };
      line.total += 1;
      if (isCorrect) line.correct += 1;
      byCourse[question.courseId] = line;
    }
  }

  return { correct, total: questions.length, byCourse };
}
