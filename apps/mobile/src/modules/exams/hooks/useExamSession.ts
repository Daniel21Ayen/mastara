// apps/mobile/src/modules/exams/hooks/useExamSession.ts
import type { Question } from '@mastara/contracts';
import { answeredCount, createExamState, examReducer, paletteCells, scoreExam } from '@mastara/domain';
import type { Answer, ExamSessionState } from '@mastara/domain';
import { useCallback, useMemo, useReducer, useRef } from 'react';

/**
 * One exam sitting: all questions are open at once and scroll in one list; answers stay editable until submit,
 * with no feedback. Actions take the question they apply to and keep the same identity between renders, so a list
 * of memoized question items does not re-render when another question is answered. Rules come from `@mastara/domain`.
 */
export function useExamSession(questions: readonly Question[], initial?: ExamSessionState) {
  const [state, dispatch] = useReducer(examReducer, initial, (start) => start ?? createExamState());
  const stateRef = useRef(state);
  stateRef.current = state;

  const total = questions.length;
  const ids = useMemo(() => questions.map((question) => question.id), [questions]);

  const chooseFor = useCallback((question: Question, optionId: string) => {
    if (question.type === 'SHORT') return;

    let optionIds: string[] = [optionId];
    if (question.type === 'MULTIPLE') {
      const current = stateRef.current.answers[question.id];
      const picked = current?.kind === 'choice' ? current.optionIds : [];
      optionIds = picked.includes(optionId) ? picked.filter((id) => id !== optionId) : [...picked, optionId];
    }
    const answer: Answer = { kind: 'choice', optionIds };
    dispatch({ type: 'answer', questionId: question.id, answer });
  }, []);

  const setTextFor = useCallback((question: Question, text: string) => {
    if (question.type === 'SHORT') dispatch({ type: 'answer', questionId: question.id, answer: { kind: 'text', text } });
  }, []);

  const toggleFlagFor = useCallback((questionId: string) => dispatch({ type: 'toggleFlag', questionId }), []);
  const goto = useCallback((index: number) => dispatch({ type: 'goto', index, total }), [total]);
  const submit = useCallback(() => dispatch({ type: 'submit' }), []);
  const score = useCallback(() => scoreExam(questions, stateRef.current.answers), [questions]);

  return {
    state,
    total,
    answered: answeredCount(state, ids),
    cells: paletteCells(state, ids),
    chooseFor,
    setTextFor,
    toggleFlagFor,
    goto,
    submit,
    score,
  };
}
