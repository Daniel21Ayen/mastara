import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseQuestionsInput,
  generateSampleCsvTemplate,
} from './questionCsvParser';

describe('questionCsvParser', () => {
  test('returns empty results for empty or whitespace content', () => {
    const result1 = parseQuestionsInput('');
    assert.equal(result1.totalRows, 0);
    assert.equal(result1.validRows.length, 0);

    const result2 = parseQuestionsInput('   \n  \n');
    assert.equal(result2.totalRows, 0);
  });

  test('parses standard comma-separated CSV with multiple choice questions', () => {
    const csv = `Question,Option A,Option B,Option C,Option D,Correct Answer,Topic,Explanation
What is the capital of Ethiopia?,Addis Ababa,Dire Dawa,Gondar,Mekelle,A,Geography,Addis Ababa is the diplomatic capital.
Which data structure is LIFO?,Queue,Stack,Array,Tree,B,Computer Science,Stack is Last-In-First-Out.`;

    const result = parseQuestionsInput(csv, 'General');

    assert.equal(result.totalRows, 2);
    assert.equal(result.validRows.length, 2);
    assert.equal(result.invalidRows.length, 0);

    const q1 = result.validRows[0]!.question;
    assert.equal(q1.prompt, 'What is the capital of Ethiopia?');
    assert.equal(q1.options?.length, 4);
    assert.equal(q1.options?.[0], 'Addis Ababa');
    assert.equal(q1.correctOption, 0);
    assert.equal(q1.topic, 'Geography');
    assert.equal(q1.answerDescription, 'Addis Ababa is the diplomatic capital.');

    const q2 = result.validRows[1]!.question;
    assert.equal(q2.prompt, 'Which data structure is LIFO?');
    assert.equal(q2.correctOption, 1);
    assert.equal(q2.topic, 'Computer Science');
  });

  test('correctly handles quoted fields with embedded commas and escaped quotes', () => {
    const csv = `Question,Option A,Option B,Option C,Option D,Correct Answer,Topic,Explanation
"Given numbers 2, 4, and 6, what is the mean?",3,4,"4, exactly",5,B,Math,"The mean is (2+4+6)/3 = 4."
"He shouted ""Eureka!"", who was he?",Newton,Archimedes,Galileo,Pythagoras,B,History,Archimedes discovered buoyant force.`;

    const result = parseQuestionsInput(csv);
    assert.equal(result.totalRows, 2);
    assert.equal(result.validRows.length, 2);

    assert.equal(result.validRows[0]!.question.prompt, 'Given numbers 2, 4, and 6, what is the mean?');
    assert.equal(result.validRows[0]!.question.options?.[2], '4, exactly');
    assert.equal(result.validRows[1]!.question.prompt, 'He shouted "Eureka!", who was he?');
  });

  test('auto-detects semicolon delimiter and tab delimiter', () => {
    const tsv = `Question\tOption A\tOption B\tCorrect Answer\tTopic
What is H2O?\tWater\tSalt\tA\tChemistry`;

    const resTsv = parseQuestionsInput(tsv);
    assert.equal(resTsv.validRows.length, 1);
    assert.equal(resTsv.validRows[0]!.question.prompt, 'What is H2O?');
    assert.equal(resTsv.validRows[0]!.question.correctOption, 0);

    const semiCsv = `Question;Option A;Option B;Option C;Correct Answer
Binary digit is called;Bit;Byte;Nibble;Bit`;

    const resSemi = parseQuestionsInput(semiCsv);
    assert.equal(resSemi.validRows.length, 1);
    assert.equal(resSemi.validRows[0]!.question.correctOption, 0); // matches option text 'Bit'
  });

  test('parses True/False questions accurately', () => {
    const csv = `Question,Type,Correct Answer,Explanation
The Earth orbits the Sun.,TRUE_FALSE,True,Heliocentric model.
Sound travels faster in vacuum than air.,TRUE_FALSE,False,Sound requires a medium.`;

    const result = parseQuestionsInput(csv);
    assert.equal(result.validRows.length, 2);

    const q1 = result.validRows[0]!.question;
    assert.equal(q1.form, 'TRUE_FALSE');
    assert.equal(q1.trueIsCorrect, true);

    const q2 = result.validRows[1]!.question;
    assert.equal(q2.form, 'TRUE_FALSE');
    assert.equal(q2.trueIsCorrect, false);
  });

  test('reports invalid rows with clear error diagnostics', () => {
    const csv = `Question,Option A,Option B,Correct Answer
,Option 1,Option 2,A
Which color is sky?,Blue,Green,Z
Incomplete multiple choice?,Single Option,,A`;

    const result = parseQuestionsInput(csv);
    assert.equal(result.validRows.length, 0);
    assert.equal(result.invalidRows.length, 3);

    assert.ok(result.invalidRows[0]!.errors.some((e) => e.includes('prompt is required')));
    assert.ok(result.invalidRows[1]!.errors.some((e) => e.includes('Invalid correct answer')));
    assert.ok(result.invalidRows[2]!.errors.some((e) => e.includes('at least 2 options')));
  });

  test('parses JSON format input', () => {
    const json = JSON.stringify([
      {
        prompt: 'What is 10 * 10?',
        options: ['10', '100', '1000'],
        correctOption: 1,
        topic: 'Arithmetic',
        explanation: 'Multiplication basis',
      },
      {
        prompt: 'Python was created by Guido van Rossum.',
        form: 'TRUE_FALSE',
        trueIsCorrect: true,
      },
    ]);

    const result = parseQuestionsInput(json);
    assert.equal(result.validRows.length, 2);
    assert.equal(result.validRows[0]!.question.prompt, 'What is 10 * 10?');
    assert.equal(result.validRows[0]!.question.correctOption, 1);
    assert.equal(result.validRows[1]!.question.form, 'TRUE_FALSE');
    assert.equal(result.validRows[1]!.question.trueIsCorrect, true);
  });

  test('generates valid downloadable sample CSV template', () => {
    const template = generateSampleCsvTemplate();
    assert.ok(template.length > 50);

    const parsed = parseQuestionsInput(template);
    assert.ok(parsed.validRows.length >= 3);
    assert.equal(parsed.invalidRows.length, 0);
  });
});
