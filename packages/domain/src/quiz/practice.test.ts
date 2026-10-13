// packages/domain/src/quiz/practice.test.ts
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { correctCount, createPracticeState, practiceReducer } from './practice';

test('a checked answer is locked', () => {
  let state = createPracticeState();
  state = practiceReducer(state, { type: 'answer', questionId: 'q1', answer: { kind: 'choice', optionIds: ['a'] } });
  state = practiceReducer(state, { type: 'check', questionId: 'q1', correct: true });
  const locked = practiceReducer(state, { type: 'answer', questionId: 'q1', answer: { kind: 'choice', optionIds: ['b'] } });
  assert.equal(locked, state);
  assert.equal(practiceReducer(state, { type: 'check', questionId: 'q1', correct: false }), state);
  assert.equal(correctCount(state), 1);
});

test('scrolling to the question already shown is not a change (so it is not saved again)', () => {
  const state = createPracticeState();
  assert.equal(practiceReducer(state, { type: 'goto', index: 0, total: 10 }), state);
  assert.equal(practiceReducer(state, { type: 'goto', index: 4, total: 10 }).index, 4);
});

test('goto stays inside the quiz', () => {
  const state = createPracticeState();
  assert.equal(practiceReducer(state, { type: 'goto', index: 99, total: 10 }).index, 9);
  assert.equal(practiceReducer(state, { type: 'goto', index: -3, total: 10 }).index, 0);
});

test('restart clears everything', () => {
  let state = createPracticeState();
  state = practiceReducer(state, { type: 'check', questionId: 'q1', correct: true });
  state = practiceReducer(state, { type: 'finish' });
  assert.deepEqual(practiceReducer(state, { type: 'restart' }), createPracticeState());
});
