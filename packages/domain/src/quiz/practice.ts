// packages/domain/src/quiz/practice.ts
import type { Answer } from './grade';

/** State of one practice run. Pure data, so it can be saved, tested and replayed. */
export interface PracticeState {
  index: number;
  answers: Readonly<Record<string, Answer>>;
  /** questionId -> was the checked answer correct. A key exists only after the answer is checked. */
  results: Readonly<Record<string, boolean>>;
  finished: boolean;
}

export type PracticeAction =
  | { type: 'answer'; questionId: string; answer: Answer }
  | { type: 'check'; questionId: string; correct: boolean }
  | { type: 'move'; delta: 1 | -1; total: number }
  /** The question now on screen while the student scrolls. Same question again is not a change. */
  | { type: 'goto'; index: number; total: number }
  | { type: 'finish' }
  | { type: 'restart' };

export function createPracticeState(): PracticeState {
  return { index: 0, answers: {}, results: {}, finished: false };
}

export function practiceReducer(state: PracticeState, action: PracticeAction): PracticeState {
  switch (action.type) {
    case 'answer':
      // A checked answer is locked in practice mode.
      if (action.questionId in state.results) return state;
      return { ...state, answers: { ...state.answers, [action.questionId]: action.answer } };
    case 'check':
      if (action.questionId in state.results) return state;
      return { ...state, results: { ...state.results, [action.questionId]: action.correct } };
    case 'move':
      return { ...state, index: Math.max(0, Math.min(action.total - 1, state.index + action.delta)) };
    case 'goto': {
      const index = Math.max(0, Math.min(action.total - 1, action.index));
      return index === state.index ? state : { ...state, index };
    }
    case 'finish':
      return { ...state, finished: true };
    case 'restart':
      return createPracticeState();
  }
}

export function isChecked(state: PracticeState, questionId: string): boolean {
  return questionId in state.results;
}

export function correctCount(state: PracticeState): number {
  return Object.values(state.results).filter(Boolean).length;
}
