// packages/domain/src/exam/session.test.ts
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { answeredCount, createExamState, examReducer, hasAnswer, paletteCells } from './session';

test('going to the question already shown is not a change (so scrolling does not re-save)', () => {
  const state = createExamState();
  assert.equal(examReducer(state, { type: 'goto', index: 0, total: 20 }), state);
  assert.equal(examReducer(state, { type: 'goto', index: 5, total: 20 }).index, 5);
});

test('goto stays inside the exam', () => {
  const state = createExamState();
  assert.equal(examReducer(state, { type: 'goto', index: 99, total: 20 }).index, 19);
  assert.equal(examReducer(state, { type: 'goto', index: -4, total: 20 }).index, 0);
});

test('answers stay editable and blank answers do not count', () => {
  let state = createExamState();
  state = examReducer(state, { type: 'answer', questionId: 'q1', answer: { kind: 'choice', optionIds: ['a'] } });
  state = examReducer(state, { type: 'answer', questionId: 'q2', answer: { kind: 'text', text: '   ' } });
  state = examReducer(state, { type: 'answer', questionId: 'q1', answer: { kind: 'choice', optionIds: ['b'] } });
  assert.equal(answeredCount(state, ['q1', 'q2', 'q3']), 1);
  assert.equal(hasAnswer(state.answers.q1), true);
});

test('flag toggles on and off and shows in the palette', () => {
  let state = createExamState();
  state = examReducer(state, { type: 'toggleFlag', questionId: 'q2' });
  assert.equal(paletteCells(state, ['q1', 'q2'])[1]?.flagged, true);
  state = examReducer(state, { type: 'toggleFlag', questionId: 'q2' });
  assert.equal(paletteCells(state, ['q1', 'q2'])[1]?.flagged, false);
});

test('nothing changes after submit', () => {
  const submitted = examReducer(createExamState(), { type: 'submit' });
  assert.equal(examReducer(submitted, { type: 'toggleFlag', questionId: 'q1' }), submitted);
});
