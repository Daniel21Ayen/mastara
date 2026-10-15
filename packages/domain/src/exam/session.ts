// packages/domain/src/exam/session.ts
import type { Answer } from '../quiz/grade';

/** State of one exam sitting. Pure data: answers stay editable until submit, with no feedback. */
export interface ExamSessionState {
  index: number;
  answers: Readonly<Record<string, Answer>>;
  flagged: Readonly<Record<string, true>>;
  submitted: boolean;
}

export type ExamAction =
  | { type: 'answer'; questionId: string; answer: Answer }
  | { type: 'toggleFlag'; questionId: string }
  | { type: 'move'; delta: 1 | -1; total: number }
  | { type: 'goto'; index: number; total: number }
  | { type: 'submit' };

export function createExamState(): ExamSessionState {
  return { index: 0, answers: {}, flagged: {}, submitted: false };
}

const clamp = (value: number, total: number) => Math.max(0, Math.min(total - 1, value));

export function examReducer(state: ExamSessionState, action: ExamAction): ExamSessionState {
  if (state.submitted) return state;

  switch (action.type) {
    case 'answer':
      return { ...state, answers: { ...state.answers, [action.questionId]: action.answer } };
    case 'toggleFlag': {
      const flagged = { ...state.flagged };
      if (flagged[action.questionId]) delete flagged[action.questionId];
      else flagged[action.questionId] = true;
      return { ...state, flagged };
    }
    case 'move':
      return { ...state, index: clamp(state.index + action.delta, action.total) };
    case 'goto': {
      const index = clamp(action.index, action.total);
      return index === state.index ? state : { ...state, index };
    }
    case 'submit':
      return { ...state, submitted: true };
  }
}

/** A choice with no option picked, or text that is blank, counts as not answered. */
export function hasAnswer(answer: Answer | undefined): boolean {
  if (!answer) return false;
  return answer.kind === 'choice' ? answer.optionIds.length > 0 : answer.text.trim().length > 0;
}

export function answeredCount(state: ExamSessionState, questionIds: readonly string[]): number {
  return questionIds.filter((id) => hasAnswer(state.answers[id])).length;
}

export interface PaletteCell {
  number: number;
  answered: boolean;
  flagged: boolean;
  current: boolean;
}

/** One cell per question for the All Questions palette. */
export function paletteCells(state: ExamSessionState, questionIds: readonly string[]): PaletteCell[] {
  return questionIds.map((id, position) => ({
    number: position + 1,
    answered: hasAnswer(state.answers[id]),
    flagged: Boolean(state.flagged[id]),
    current: position === state.index,
  }));
}
