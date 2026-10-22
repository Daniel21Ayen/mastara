// packages/domain/src/assessment/bulkQuestionParser.test.ts
import assert from 'node:assert/strict';
import test from 'node:test';

import { parseCsv } from './csvParser';
import {
  parseBulkQuestions,
  validateKatexSyntax,
  generateQuestionCsvTemplate,
} from './bulkQuestionParser';

test('csvParser: handles quoted fields, commas, escaped quotes, and newlines', () => {
  const csv = [
    'id,prompt,options',
    'Q1,"What is, force?","Option A, Option B"',
    'Q2,"He said ""hello""","A|B"',
    'Q3,"Line 1\nLine 2","A"',
  ].join('\n');

  const rows = parseCsv(csv);
  assert.strictEqual(rows.length, 4);
  assert.deepStrictEqual(rows[0], ['id', 'prompt', 'options']);
  assert.strictEqual(rows[1]![1], 'What is, force?');
  assert.strictEqual(rows[2]![1], 'He said "hello"');
  assert.strictEqual(rows[3]![1], 'Line 1\nLine 2');
});

test('validateKatexSyntax: verifies matched delimiters and balanced braces', () => {
  // Valid math
  assert.strictEqual(validateKatexSyntax('Formula $E = mc^2$ and $$\\frac{a}{b}$$'), null);
  assert.strictEqual(validateKatexSyntax('Plain text without math'), null);
  assert.strictEqual(validateKatexSyntax('Costs \\$5.00 only'), null);

  // Unclosed delimiter
  const unclosedDelim = validateKatexSyntax('Formula $E = mc^2 is missing a closing dollar');
  assert.ok(unclosedDelim !== null);
  assert.ok(unclosedDelim!.includes('Unmatched LaTeX delimiter'));

  // Unclosed brace
  const unclosedBrace = validateKatexSyntax('Formula $\\frac{a}{b$ has missing brace');
  assert.ok(unclosedBrace !== null);
  assert.ok(unclosedBrace!.includes('Unclosed opening brace'));
});

test('parseBulkQuestions: parses and validates valid sample template', () => {
  const template = generateQuestionCsvTemplate();
  const result = parseBulkQuestions(template);

  assert.strictEqual(result.totalRows, 5);
  assert.strictEqual(result.errorRows, 0);
  assert.strictEqual(result.validRows, 5);
  assert.strictEqual(result.errors.length, 0);

  // Check Q1 (Multiple Choice)
  const q1 = result.questions[0]!;
  assert.strictEqual(q1.id, 'Q1');
  assert.strictEqual(q1.form, 'MULTIPLE_CHOICE');
  assert.strictEqual(q1.topic, 'Mechanics');
  assert.strictEqual(q1.options.length, 4);
  assert.strictEqual(q1.correctOption, 1); // 'B' -> index 1 (Newton)

  // Check Q3 (True/False)
  const q3 = result.questions[2]!;
  assert.strictEqual(q3.id, 'Q3');
  assert.strictEqual(q3.form, 'TRUE_FALSE');
  assert.strictEqual(q3.trueIsCorrect, true);

  // Check Q4 (Short Answer)
  const q4 = result.questions[3]!;
  assert.strictEqual(q4.id, 'Q4');
  assert.strictEqual(q4.form, 'SHORT_ANSWER');
  assert.deepStrictEqual(q4.acceptedAnswers, ['Magnetic Field']);

  // Check Q5 (Blank Space)
  const q5 = result.questions[4]!;
  assert.strictEqual(q5.id, 'Q5');
  assert.strictEqual(q5.form, 'BLANK_SPACE');
  assert.deepStrictEqual(q5.acceptedAnswers, ['refraction']);
});

test('parseBulkQuestions: catches duplicate IDs and missing correct options', () => {
  const invalidCsv = [
    'id,form,prompt,option_a,option_b,correct',
    'DUP-1,MULTIPLE_CHOICE,First question,Alpha,Beta,A',
    'DUP-1,MULTIPLE_CHOICE,Second question,Alpha,Beta,B',
    'Q3,MULTIPLE_CHOICE,No correct answer,Alpha,Beta,Z',
  ].join('\n');

  const result = parseBulkQuestions(invalidCsv);
  assert.strictEqual(result.totalRows, 3);
  assert.strictEqual(result.validRows, 1); // Only the first row is valid
  assert.ok(result.errors.some((e) => e.field === 'id' && e.message.includes('Duplicate Question ID')));
  assert.ok(result.errors.some((e) => e.field === 'correct' && e.message.includes('Valid correct choice required')));
});

test('parseBulkQuestions: parses JSON array of questions', () => {
  const json = [
    {
      id: 'CHEM-01',
      form: 'MULTIPLE_CHOICE',
      topic: 'Organic',
      prompt: 'What is methane?',
      options: ['CH4', 'C2H6', 'CO2'],
      correct: 'A',
      explanation: 'Methane is the simplest alkane with formula CH4.',
    },
  ];

  const result = parseBulkQuestions(json);
  assert.strictEqual(result.totalRows, 1);
  assert.strictEqual(result.validRows, 1);
  assert.strictEqual(result.questions[0]!.id, 'CHEM-01');
  assert.strictEqual(result.questions[0]!.correctOption, 0);
});
