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

const KIND_SLUGS: Record<ExamSetKind, string> = {
  MID: 'mid-exams',
  FINAL: 'final-exams',
  MOCK: 'mock-exams',
  COC: 'coc-exams',
};

const SLUG_TO_KIND: Record<string, ExamSetKind> = {
  mid: 'MID',
  'mid-exams': 'MID',
  'mid-exam': 'MID',
  final: 'FINAL',
  'final-exams': 'FINAL',
  'final-exam': 'FINAL',
  mock: 'MOCK',
  'mock-exams': 'MOCK',
  'mock-exam': 'MOCK',
  coc: 'COC',
  'coc-exams': 'COC',
  'coc-exam': 'COC',
};

/** The address part of each tab: /questions/mid-exams, /questions/final-exams, etc. */
export const examSetSlug = (kind: ExamSetKind): string => KIND_SLUGS[kind] ?? kind.toLowerCase();

export function examSetKindFromSlug(slug: string): ExamSetKind | null {
  const normalized = slug.toLowerCase().trim();
  return SLUG_TO_KIND[normalized] ?? null;
}
