// packages/domain/src/assessment/examSetExport.test.ts
import assert from 'node:assert/strict';
import test from 'node:test';

import { parseBulkQuestions } from './bulkQuestionParser';
import {
  exportExamSetToCsv,
  exportExamSetToPrintableHtml,
  type ExportableExamSet,
} from './examSetExport';

const sampleExamSet: ExportableExamSet = {
  id: 'EXAM-SET-9901',
  kind: 'MID',
  universityName: 'Addis Ababa University',
  programName: 'Computer Science',
  courseTitle: 'Database Systems',
  courseCode: 'CS311',
  year: 2024,
  semesterNumber: 1,
  stream: 'NATURAL',
  minutes: 60,
  questions: [
    {
      id: 'DB-01',
      form: 'MULTIPLE_CHOICE',
      topic: 'Relational Model',
      prompt: 'Which normal form eliminates partial dependency? $R(A, B, C)$',
      options: ['1NF', '2NF', '3NF', 'BCNF'],
      correctOption: 1, // '2NF' -> B
      trueIsCorrect: null,
      acceptedAnswers: [],
      answerDescription: 'Second Normal Form (2NF) ensures no partial functional dependencies.',
    },
    {
      id: 'DB-02',
      form: 'TRUE_FALSE',
      topic: 'Transactions',
      prompt: 'ACID properties guarantee reliability of database transactions.',
      options: [],
      correctOption: null,
      trueIsCorrect: true,
      acceptedAnswers: [],
      answerDescription: 'Atomicity, Consistency, Isolation, and Durability ensure transaction safety.',
    },
    {
      id: 'DB-03',
      form: 'SHORT_ANSWER',
      topic: 'Indexing',
      prompt: 'What data structure is standard for primary indexes in relational DBMS?',
      options: [],
      correctOption: null,
      trueIsCorrect: null,
      acceptedAnswers: ['B+ Tree', 'B-Tree'],
      answerDescription: 'B+ Trees provide balanced logarithmic search and sequential range scans.',
    },
  ],
};

test('exportExamSetToCsv: exports valid RFC 4180 CSV with BOM and round-trips through parseBulkQuestions', () => {
  const csv = exportExamSetToCsv(sampleExamSet);

  // Check UTF-8 BOM
  assert.ok(csv.startsWith('\uFEFF'), 'CSV should start with UTF-8 BOM');

  // Verify headers and content
  assert.ok(csv.includes('id,form,topic,prompt,option_a,option_b,option_c,option_d,correct,explanation'));
  assert.ok(csv.includes('DB-01'));
  assert.ok(csv.includes('2NF'));
  assert.ok(csv.includes('B')); // Correct letter for 2NF
  assert.ok(csv.includes('TRUE')); // Correct for True/False

  // Round-trip test: feeding the exported CSV into the bulk question parser
  const parsed = parseBulkQuestions(csv);
  assert.strictEqual(parsed.totalRows, 3);
  assert.strictEqual(parsed.errorRows, 0);
  assert.strictEqual(parsed.validRows, 3);

  // Validate Q1
  assert.strictEqual(parsed.questions[0]!.id, 'DB-01');
  assert.strictEqual(parsed.questions[0]!.form, 'MULTIPLE_CHOICE');
  assert.strictEqual(parsed.questions[0]!.correctOption, 1);
  assert.strictEqual(parsed.questions[0]!.options[1], '2NF');

  // Validate Q2
  assert.strictEqual(parsed.questions[1]!.id, 'DB-02');
  assert.strictEqual(parsed.questions[1]!.form, 'TRUE_FALSE');
  assert.strictEqual(parsed.questions[1]!.trueIsCorrect, true);

  // Validate Q3
  assert.strictEqual(parsed.questions[2]!.id, 'DB-03');
  assert.strictEqual(parsed.questions[2]!.form, 'SHORT_ANSWER');
  assert.ok(parsed.questions[2]!.acceptedAnswers.includes('B+ Tree'));
});

test('exportExamSetToPrintableHtml: produces complete printable document with header, questions, and solutions', () => {
  const htmlWithKey = exportExamSetToPrintableHtml(sampleExamSet, { includeAnswers: true, autoprint: true });

  // Header & Student info
  assert.ok(htmlWithKey.includes('Addis Ababa University'));
  assert.ok(htmlWithKey.includes('Computer Science'));
  assert.ok(htmlWithKey.includes('Database Systems (CS311)'));
  assert.ok(htmlWithKey.includes('Student Full Name:'));
  assert.ok(htmlWithKey.includes('Duration:</strong> 60 Min'));

  // Question details
  assert.ok(htmlWithKey.includes('Q1.'));
  assert.ok(htmlWithKey.includes('DB-01'));
  assert.ok(htmlWithKey.includes('Relational Model'));
  assert.ok(htmlWithKey.includes('(B)'));
  assert.ok(htmlWithKey.includes('2NF'));

  // Answer Key
  assert.ok(htmlWithKey.includes("Teacher's Official Answer Key &amp; Solutions"));
  assert.ok(htmlWithKey.includes('Second Normal Form (2NF) ensures no partial functional dependencies.'));

  // Autoprint script
  assert.ok(htmlWithKey.includes('window.print()'));

  // When includeAnswers is false
  const htmlWithoutKey = exportExamSetToPrintableHtml(sampleExamSet, { includeAnswers: false });
  assert.ok(!htmlWithoutKey.includes("Teacher's Official Answer Key &amp; Solutions"));
});

test('exportExamSetToCsv & exportExamSetToPrintableHtml: gracefully formats object options into strings', () => {
  const setWithObjOptions: any = {
    id: 'SET-OBJ-01',
    kind: 'FINAL',
    minutes: 45,
    questions: [
      {
        id: 'Q-OBJ',
        form: 'MULTIPLE_CHOICE',
        topic: 'Math',
        prompt: 'What is 2+2?',
        options: [
          { id: 'opt_a', label: { en: 'Four', am: 'አራት' } },
          { id: 'opt_b', text_en: 'Five' },
          { id: 'opt_c', label: 'Six' },
          'Seven',
        ],
        correctOption: 0,
        trueIsCorrect: null,
        acceptedAnswers: [],
        answerDescription: 'Basic arithmetic.',
      },
    ],
  };

  const csv = exportExamSetToCsv(setWithObjOptions);
  assert.ok(!csv.includes('[object Object]'), 'CSV must not contain [object Object]');
  assert.ok(csv.includes('Four'));
  assert.ok(csv.includes('Five'));
  assert.ok(csv.includes('Six'));
  assert.ok(csv.includes('Seven'));

  const html = exportExamSetToPrintableHtml(setWithObjOptions, { includeAnswers: true });
  assert.ok(!html.includes('[object Object]'), 'HTML must not contain [object Object]');
  assert.ok(html.includes('Four'));
  assert.ok(html.includes('Five'));
});
