// packages/domain/src/assessment/setRules.ts
import { EXAM_SET_KINDS } from '../constants/admin';
import type { ExamSetKind } from '../constants/admin';

import { questionProblems } from './questionRules';
import type { QuestionDraft } from './questionRules';

/** What still blocks publishing an exam set. */
export type SetProblem = 'empty' | 'incomplete' | 'topic';

/** Mid and Final questions name their topic; COC and Mock questions do not. */
export const needsTopic = (kind: ExamSetKind): boolean => kind === 'MID' || kind === 'FINAL';

/** Only COC sets mix courses, so only they have no course of their own. */
export const needsCourse = (kind: ExamSetKind): boolean => kind !== 'COC';

/**
 * An exam set can go live when it has questions, every question is finished, and (for Mid and Final)
 * every question names its topic.
 */
export function setProblems(set: {
  kind: ExamSetKind;
  questions: ReadonlyArray<QuestionDraft & { topic: string }>;
}): SetProblem[] {
  const problems: SetProblem[] = [];
  if (set.questions.length === 0) return ['empty'];
  if (set.questions.some((question) => questionProblems(question).length > 0)) {
    problems.push('incomplete');
  }
  if (needsTopic(set.kind) && set.questions.some((question) => question.topic.trim() === '')) {
    problems.push('topic');
  }
  return problems;
}

/** The address part of each tab: /questions/mid, /questions/final, /questions/coc, /questions/mock. */
export const examSetSlug = (kind: ExamSetKind): string => kind.toLowerCase();

export function examSetKindFromSlug(slug: string): ExamSetKind | null {
  const match = EXAM_SET_KINDS.find((kind) => kind.toLowerCase() === slug);
  return match ?? null;
}
