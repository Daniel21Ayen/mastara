// apps/mobile/src/modules/quizzes/hooks/usePracticeSession.ts
import type { Question } from '@mastara/contracts';
import { correctCount, createPracticeState, gradeAnswer, practiceReducer } from '@mastara/domain';
import type { Answer } from '@mastara/domain';
import { useCallback } from 'react';

import { outbox } from '@/core/sync';
import { usePersistedReducer } from '@/shared/hooks';

import { attemptRepository } from '../repo/attempt.repository';

/** Runs one practice session: answer, immediate feedback, next. All rules come from `@mastara/domain`. */
export function usePracticeSession(chapterId: string, questions: readonly Question[]) {
  // Every answer is saved on the phone at once, so a practice run survives the app being closed.
  const { state, dispatch, ready } = usePersistedReducer(
    `practice:${chapterId}`,
    practiceReducer,
    createPracticeState,
    (saved) => !saved.finished, // a finished run is not kept: its result is stored instead
  );

  const total = questions.length;
  const question = questions[state.index];
  const answer = question ? state.answers[question.id] : undefined;
  const checked = question ? question.id in state.results : false;
  const correct = question ? state.results[question.id] : undefined;

  const checkWith = useCallback(
    (target: Question, given: Answer) =>
      dispatch({ type: 'check', questionId: target.id, correct: gradeAnswer(target, given) }),
    [dispatch],
  );

  /** Tap an option. Single choice and True/False check at once; multiple choice just toggles. */
  const choose = useCallback(
    (optionId: string) => {
      if (!question || question.type === 'SHORT' || checked) return;

      if (question.type === 'MULTIPLE') {
        const current = answer?.kind === 'choice' ? answer.optionIds : [];
        const optionIds = current.includes(optionId)
          ? current.filter((id) => id !== optionId)
          : [...current, optionId];
        dispatch({ type: 'answer', questionId: question.id, answer: { kind: 'choice', optionIds } });
        return;
      }

      const picked: Answer = { kind: 'choice', optionIds: [optionId] };
      dispatch({ type: 'answer', questionId: question.id, answer: picked });
      checkWith(question, picked);
    },
    [question, answer, checked, checkWith, dispatch],
  );

  const setText = useCallback(
    (text: string) => {
      if (question?.type === 'SHORT' && !checked) {
        dispatch({ type: 'answer', questionId: question.id, answer: { kind: 'text', text } });
      }
    },
    [question, checked, dispatch],
  );

  /** For multiple choice and short answers. */
  const check = useCallback(() => {
    if (question && answer && !checked) checkWith(question, answer);
  }, [question, answer, checked, checkWith]);

  const move = useCallback((delta: 1 | -1) => dispatch({ type: 'move', delta, total }), [total, dispatch]);
  const restart = useCallback(() => dispatch({ type: 'restart' }), [dispatch]);

  const finish = useCallback(async () => {
    dispatch({ type: 'finish' });
    const result = { chapterId, correct: correctCount(state), total, finishedAt: new Date().toISOString() };
    await attemptRepository.saveResult(result);
    await outbox.enqueue('ATTEMPT_FINISHED', result); // the server gets it when the phone is online
  }, [chapterId, state, total, dispatch]);

  const canCheck =
    !checked &&
    answer !== undefined &&
    (answer.kind === 'text' ? answer.text.trim().length > 0 : answer.optionIds.length > 0);

  return {
    ready,
    state,
    total,
    question,
    answer,
    checked,
    correct,
    canCheck,
    isLast: state.index === total - 1,
    correctTotal: correctCount(state),
    choose,
    setText,
    check,
    move,
    finish,
    restart,
  };
}
