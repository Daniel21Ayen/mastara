// packages/domain/src/quiz/grade.ts
import type { ChoiceType } from '../constants/assessment';

export type Answer = { kind: 'choice'; optionIds: readonly string[] } | { kind: 'text'; text: string };

/** The part of a question the grader needs. The API question shape satisfies it. */
export type GradableQuestion =
  | { type: ChoiceType; correctOptionIds: readonly string[] }
  | { type: 'SHORT'; acceptedAnswers: readonly string[] };

/** Lower-case, trim, collapse spaces and drop surrounding punctuation so "  Goes. " matches "goes". */
export function normalizeText(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/^[\p{P}\p{S}]+|[\p{P}\p{S}]+$/gu, '');
}

export function gradeAnswer(question: GradableQuestion, answer: Answer): boolean {
  if (question.type === 'SHORT') {
    if (answer.kind !== 'text') return false;
    const given = normalizeText(answer.text);
    return given.length > 0 && question.acceptedAnswers.some((accepted) => normalizeText(accepted) === given);
  }

  if (answer.kind !== 'choice') return false;
  const chosen = new Set(answer.optionIds);
  return chosen.size === question.correctOptionIds.length && question.correctOptionIds.every((id) => chosen.has(id));
}
