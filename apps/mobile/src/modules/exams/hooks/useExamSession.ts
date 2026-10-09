// apps/mobile/src/modules/exams/hooks/useExamSession.ts
import type { Question } from '@mastara/contracts';
import { answeredCount, createExamState, examReducer, paletteCells, scoreExam } from '@mastara/domain';
import type { Answer, ExamSessionState } from '@mastara/domain';
import { useCallback, useMemo, useReducer } from 'react';

/** One exam sitting: answers stay editable until submit, with no feedback. Rules come from `@mastara/domain`. */
export function useExamSession(questions: readonly Question[], initial?: ExamSessionState) {
  const [state, dispatch] = useReducer(examReducer, initial, (start) => start ?? createExamState());

  const total = questions.length;
  const ids = useMemo(() => questions.map((question) => question.id), [questions]);
  const question = questions[state.index];
  const answer = question ? state.answers[question.id] : undefined;

  const choose = useCallback(
    (optionId: string) => {
      if (!question || question.type === 'SHORT') return;

      let optionIds: string[] = [optionId];
      if (question.type === 'MULTIPLE') {
        const current = answer?.kind === 'choice' ? answer.optionIds : [];
        optionIds = current.includes(optionId) ? current.filter((id) => id !== optionId) : [...current, optionId];
      }
      const next: Answer = { kind: 'choice', optionIds };
      dispatch({ type: 'answer', questionId: question.id, answer: next });
    },
    [question, answer],
  );

  const setText = useCallback(
    (text: string) => {
      if (question?.type === 'SHORT') {
        dispatch({ type: 'answer', questionId: question.id, answer: { kind: 'text', text } });
      }
    },
    [question],
  );

  return {
    state,
    total,
    question,
    answer,
    flagged: question ? Boolean(state.flagged[question.id]) : false,
    answered: answeredCount(state, ids),
    cells: paletteCells(state, ids),
    isFirst: state.index === 0,
    isLast: state.index === total - 1,
    choose,
    setText,
    toggleFlag: () => question && dispatch({ type: 'toggleFlag', questionId: question.id }),
    move: (delta: 1 | -1) => dispatch({ type: 'move', delta, total }),
    goto: (index: number) => dispatch({ type: 'goto', index, total }),
    submit: () => dispatch({ type: 'submit' }),
    score: () => scoreExam(questions, state.answers),
  };
}
