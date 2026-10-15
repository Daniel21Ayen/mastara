// apps/mobile/src/modules/quizzes/hooks/usePracticeSession.ts
import type { Question } from '@mastara/contracts';
import { correctCount, createPracticeState, gradeAnswer, practiceReducer } from '@mastara/domain';
import type { Answer } from '@mastara/domain';
import { useCallback, useRef } from 'react';

import { outbox } from '@/core/sync';
import { usePersistedReducer } from '@/shared/hooks';

import { attemptRepository } from '../repo/attempt.repository';

/**
 * Runs one practice session: every question on one scrolling page, instant feedback after each answer.
 * Actions take the question they apply to and keep one identity between renders, so a list of memoized question items
 * does not re-render when another question is answered. All rules come from `@mastara/domain`.
 */
export function usePracticeSession(chapterId: string, questions: readonly Question[]) {
  // Every answer is saved on the phone at once, so a practice run survives the app being closed.
  const { state, dispatch, ready } = usePersistedReducer(
    `practice:${chapterId}`,
    practiceReducer,
    createPracticeState,
    (saved) => !saved.finished, // a finished run is not kept: its result is stored instead
  );
  const stateRef = useRef(state);
  stateRef.current = state;

  const total = questions.length;

  const checkWith = useCallback(
    (target: Question, given: Answer) =>
      dispatch({ type: 'check', questionId: target.id, correct: gradeAnswer(target, given) }),
    [dispatch],
  );

  /** Tap an option. Single choice and True/False check at once; multiple choice just toggles. */
  const chooseFor = useCallback(
    (question: Question, optionId: string) => {
      const current = stateRef.current;
      if (question.type === 'SHORT' || question.id in current.results) return;

      if (question.type === 'MULTIPLE') {
        const saved = current.answers[question.id];
        const picked = saved?.kind === 'choice' ? saved.optionIds : [];
        const optionIds = picked.includes(optionId) ? picked.filter((id) => id !== optionId) : [...picked, optionId];
        dispatch({ type: 'answer', questionId: question.id, answer: { kind: 'choice', optionIds } });
        return;
      }

      const answer: Answer = { kind: 'choice', optionIds: [optionId] };
      dispatch({ type: 'answer', questionId: question.id, answer });
      checkWith(question, answer);
    },
    [checkWith, dispatch],
  );

  const setTextFor = useCallback(
    (question: Question, text: string) => {
      if (question.type === 'SHORT' && !(question.id in stateRef.current.results)) {
        dispatch({ type: 'answer', questionId: question.id, answer: { kind: 'text', text } });
      }
    },
    [dispatch],
  );

  /** For multiple choice and short answers. */
  const checkFor = useCallback(
    (question: Question) => {
      const current = stateRef.current;
      const answer = current.answers[question.id];
      if (answer && !(question.id in current.results)) checkWith(question, answer);
    },
    [checkWith],
  );

  const goto = useCallback((index: number) => dispatch({ type: 'goto', index, total }), [total, dispatch]);
  const restart = useCallback(() => dispatch({ type: 'restart' }), [dispatch]);

  const finish = useCallback(async () => {
    dispatch({ type: 'finish' });
    const result = {
      chapterId,
      correct: correctCount(stateRef.current),
      total,
      finishedAt: new Date().toISOString(),
    };
    await attemptRepository.saveResult(result);
    await outbox.enqueue('ATTEMPT_FINISHED', result); // the server gets it when the phone is online
  }, [chapterId, total, dispatch]);

  return {
    ready,
    state,
    total,
    answered: Object.keys(state.results).length,
    correctTotal: correctCount(state),
    chooseFor,
    setTextFor,
    checkFor,
    goto,
    finish,
    restart,
  };
}
