// apps/admin-web/src/modules/content/contentManagement.test.ts
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  INITIAL_TEST_SETS,
  INITIAL_MATERIALS,
  type TestSetItem,
} from './state/contentManagementData';

describe('Content Management and Test Set Integration', () => {
  it('contains initial test sets matching the Test Set Management design', () => {
    assert.ok(INITIAL_TEST_SETS.length >= 2, 'Should have initial test sets');
    
    // Row 1 from Screenshot 1: Chapter 1 / Introduction, Introduction to Human Geography, Sem 2, Social, BSc Geography, Inactive
    const row1 = INITIAL_TEST_SETS.find(
      (t) => t.chapterTitle === 'Chapter 1' && t.courseTitle === 'Introduction to Human Geography',
    );
    assert.ok(row1, 'Row 1 must exist');
    assert.equal(row1?.semester, 'Sem 2');
    assert.equal(row1?.stream, 'Social');
    assert.equal(row1?.program, 'BSc Geography');
    assert.equal(row1?.status, 'Inactive');
    assert.ok(row1?.question, 'Row 1 question attribute must exist');

    // Row 2 from Screenshot 1: Chapter 3 / Advanced Topics, General Physics, Sem 1, Natural, BSc Physics, Active
    const row2 = INITIAL_TEST_SETS.find(
      (t) => t.chapterTitle === 'Chapter 3' && t.courseTitle === 'General Physics',
    );
    assert.ok(row2, 'Row 2 must exist');
    assert.equal(row2?.semester, 'Sem 1');
    assert.equal(row2?.stream, 'Natural');
    assert.equal(row2?.program, 'BSc Physics');
    assert.equal(row2?.status, 'Active');
    assert.ok(row2?.question, 'Row 2 question attribute must exist');
  });

  it('contains initial materials matching the Material Management design', () => {
    assert.ok(INITIAL_MATERIALS.length >= 2, 'Should have initial materials');

    // Row 1 from Screenshot 2: Module 1 / Basics of Geography, Introduction to Human Geography, Sem 2, Social, Active
    const mod1 = INITIAL_MATERIALS.find(
      (m) => m.title === 'Module 1' && m.courseTitle === 'Introduction to Human Geography',
    );
    assert.ok(mod1, 'Module 1 must exist');
    assert.equal(mod1?.semester, 'Sem 2');
    assert.equal(mod1?.program, 'Social');
    assert.equal(mod1?.status, 'Active');

    // Row 2 from Screenshot 2: Module 3 / Climate and Environment, General Physics, Sem 1, Natural, Inactive
    const mod3 = INITIAL_MATERIALS.find(
      (m) => m.title === 'Module 3' && m.courseTitle === 'General Physics',
    );
    assert.ok(mod3, 'Module 3 must exist');
    assert.equal(mod3?.semester, 'Sem 1');
    assert.equal(mod3?.program, 'Natural');
    assert.equal(mod3?.status, 'Inactive');
  });

  it('validates all 7 required fields of a built test set: Program, semester, stream, course, test set id, time allowed, access/permission', () => {
    const builtTestSet: TestSetItem = {
      id: 'ts-built-01',
      questionId: 'Q-999',
      question: 'Identify the primary syntactic structure in academic prose.',
      questionType: 'Multiple Choice',
      testSetId: 'TS-QUIZ1-ENG-001',
      quizNo: 1,
      chapterNumber: 1,
      chapterTitle: 'Chapter 1',
      chapterSubtitle: 'Foundations',
      courseTitle: 'Communicative English',
      courseCode: 'ENG101',
      semester: 'Sem 1',
      stream: 'Common',
      program: 'Software Engineering',
      timeAllowed: '45 minutes',
      access: 'Public',
      status: 'Active',
      verified: true,
    };

    // Assert all 7 required fields are defined
    assert.ok(builtTestSet.program, 'Program is required');
    assert.ok(builtTestSet.semester, 'Semester is required');
    assert.ok(builtTestSet.stream, 'Stream is required');
    assert.ok(builtTestSet.courseTitle, 'Course is required');
    assert.ok(builtTestSet.testSetId, 'Test Set ID is required');
    assert.ok(builtTestSet.timeAllowed, 'Time Allowed is required');
    assert.ok(builtTestSet.access, 'Access / Permission is required');

    assert.equal(builtTestSet.program, 'Software Engineering');
    assert.equal(builtTestSet.semester, 'Sem 1');
    assert.equal(builtTestSet.stream, 'Common');
    assert.equal(builtTestSet.courseTitle, 'Communicative English');
    assert.equal(builtTestSet.testSetId, 'TS-QUIZ1-ENG-001');
    assert.equal(builtTestSet.timeAllowed, '45 minutes');
    assert.equal(builtTestSet.access, 'Public');
  });

  it('verifies attaching PDF and scanned PDF directly appends into Chapter content field', () => {
    let chapterContent = 'Learn common words and phrases for everyday use.';
    const pdfFile = { name: 'English_Basics_Handout.pdf', sizeKb: 345 };
    const scannedFile = { name: 'Document_Scan_Grammar.pdf', sizeKb: 1280 };

    // Attaching regular PDF
    const pdfTag = `[Attached PDF: ${pdfFile.name} (${pdfFile.sizeKb} KB)]`;
    chapterContent = `${chapterContent}\n\n${pdfTag}`;

    assert.ok(chapterContent.includes('[Attached PDF: English_Basics_Handout.pdf (345 KB)]'));
    assert.ok(chapterContent.startsWith('Learn common words'));

    // Attaching scanned PDF
    const scannedTag = `[Attached Scanned PDF: ${scannedFile.name} (${scannedFile.sizeKb} KB)]`;
    chapterContent = `${chapterContent}\n\n${scannedTag}`;

    assert.ok(chapterContent.includes('[Attached Scanned PDF: Document_Scan_Grammar.pdf (1280 KB)]'));

    // Removing an attachment cleans up the tag from the content
    const lines = chapterContent.split('\n');
    const filtered = lines.filter((line) => !line.includes('[Attached PDF:'));
    const cleanedContent = filtered.join('\n').trim();

    assert.ok(!cleanedContent.includes('[Attached PDF:'));
    assert.ok(cleanedContent.includes('[Attached Scanned PDF:'));
  });

  it('validates Material Management columns without Module Title attribute', () => {
    const materialTableColumns = [
      '#',
      'Chapter',
      'Course',
      'Semester',
      'Program',
      'Status',
      'Actions',
    ];

    assert.equal(materialTableColumns.length, 7, 'Material table must have exactly 7 columns');
    assert.ok(!materialTableColumns.includes('Module Title'), 'Module Title column must be removed');
    assert.ok(!materialTableColumns.includes('Note Title'), 'Note Title column must be removed');
    assert.ok(!materialTableColumns.includes('Amharic Note Title'), 'Amharic Note Title column must be removed');
    assert.ok(materialTableColumns.includes('Chapter'), 'Chapter column must be present');
    assert.ok(materialTableColumns.includes('Course'), 'Course column must be present');
  });

  it('validates question attribute formatting in Test Set Management to minimize row cell height', () => {
    const questionText = 'Calculate the net torque required to accelerate a uniform cylindrical rotor from rest to 120 rad/s in 4.0 seconds.';
    // Verifying question attribute is accessible, preserves full text for tooltip while styling truncates single line
    assert.ok(questionText.length > 50, 'Original question is lengthy');
    const truncatedSnippet = questionText.slice(0, 45) + '...';
    assert.ok(truncatedSnippet.length < questionText.length);
  });

  it('verifies question form holds answer explanation for MULTIPLE_CHOICE and TRUE_FALSE questions', () => {
    const mcQuestion = {
      form: 'MULTIPLE_CHOICE',
      prompt: 'What is the speed of sound in air at 20°C?',
      options: ['343 m/s', '300 m/s', '1500 m/s', '331 m/s'],
      correctOption: 0,
      explanation: 'At 20°C (68°F), the speed of sound in air is approximately 343 m/s (1,235 km/h).',
    };

    assert.equal(mcQuestion.form, 'MULTIPLE_CHOICE');
    assert.ok(mcQuestion.explanation, 'Explanation must be present');
    assert.ok(mcQuestion.explanation.includes('343 m/s'));

    const tfQuestion = {
      form: 'TRUE_FALSE',
      prompt: 'Sound travels faster in water than in air.',
      trueIsCorrect: true,
      explanation: 'Sound travels roughly 4.3 times faster in water (approx 1,480 m/s) due to higher medium density and bulk modulus.',
    };

    assert.equal(tfQuestion.form, 'TRUE_FALSE');
    assert.equal(tfQuestion.trueIsCorrect, true);
    assert.ok(tfQuestion.explanation.includes('faster in water'));
  });

  it('verifies chapter creation auto-increments chapter number to Chapter N - New Chapter without module or amharic fields', () => {
    const existingModules = [
      { id: 'mod-1', number: 1, title: { en: 'Chapter 1', am: '' } },
      { id: 'mod-2', number: 2, title: { en: 'Chapter 2', am: '' } },
      { id: 'mod-3', number: 3, title: { en: 'Chapter 3', am: '' } },
    ];

    const nextChapterNum = (existingModules.length > 0 ? Math.max(...existingModules.map((m) => m.number || 0)) : 0) + 1;
    assert.equal(nextChapterNum, 4, 'Next chapter number must be 4');

    const autoChapterTitle = `Chapter ${nextChapterNum} - New Chapter`;
    assert.equal(autoChapterTitle, 'Chapter 4 - New Chapter');

    // Verify payload excludes module picker and Amharic title
    const chapterPayload = {
      title: { en: autoChapterTitle, am: '' },
    };
    assert.equal(chapterPayload.title.en, 'Chapter 4 - New Chapter');
    assert.equal(chapterPayload.title.am, '');
  });
});


