// apps/admin-web/src/modules/questions/lib/questionCsvParser.ts
import type { ExamQuestionInput } from '@mastara/contracts';

export interface ParsedQuestionRow {
  rowNumber: number;
  question: ExamQuestionInput;
  rawRecord: Record<string, string>;
  isValid: boolean;
  errors: string[];
}

export interface CsvParseResult {
  totalRows: number;
  validRows: ParsedQuestionRow[];
  invalidRows: ParsedQuestionRow[];
  allQuestions: ExamQuestionInput[];
}

/**
 * Splits CSV lines while respecting quoted fields and internal commas/quotes.
 */
function parseCsvLine(line: string, delimiter: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"';
        i++; // skip escaped quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

/**
 * Automatically detects whether CSV uses comma, tab, or semicolon.
 */
function detectDelimiter(text: string): string {
  const firstLine = text.split(/\r?\n/)[0] || '';
  const commaCount = (firstLine.match(/,/g) || []).length;
  const tabCount = (firstLine.match(/\t/g) || []).length;
  const semiCount = (firstLine.match(/;/g) || []).length;

  if (tabCount > commaCount && tabCount > semiCount) return '\t';
  if (semiCount > commaCount && semiCount > tabCount) return ';';
  return ',';
}

function cleanHeader(header: string): string {
  return header.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Parses raw text (CSV or JSON) into structured ExamQuestionInput items.
 */
export function parseQuestionsInput(rawContent: string, defaultTopic = 'General'): CsvParseResult {
  const trimmed = rawContent.trim();
  if (!trimmed) {
    return { totalRows: 0, validRows: [], invalidRows: [], allQuestions: [] };
  }

  // Attempt JSON parsing if text begins with '['
  if (trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parseJsonQuestions(parsed, defaultTopic);
      }
    } catch {
      // Fallback to CSV parser if JSON parsing fails
    }
  }

  return parseCsvQuestions(trimmed, defaultTopic);
}

function parseJsonQuestions(items: unknown[], defaultTopic: string): CsvParseResult {
  const validRows: ParsedQuestionRow[] = [];
  const invalidRows: ParsedQuestionRow[] = [];

  items.forEach((item, index) => {
    const rowNumber = index + 1;
    const errors: string[] = [];
    const obj = (item && typeof item === 'object' ? item : {}) as Record<string, any>;

    const prompt = String(obj.prompt || obj.question || '').trim();
    if (!prompt) errors.push('Question prompt is required');

    let form: ExamQuestionInput['form'] = 'MULTIPLE_CHOICE';
    if (obj.form === 'TRUE_FALSE' || obj.type === 'TRUE_FALSE') {
      form = 'TRUE_FALSE';
    } else if (obj.form === 'SHORT_ANSWER' || obj.type === 'SHORT_ANSWER') {
      form = 'SHORT_ANSWER';
    }

    const options: string[] = Array.isArray(obj.options)
      ? obj.options.map(String).filter((o) => o.trim().length > 0)
      : [];

    let correctOption: number | null = null;
    let trueIsCorrect: boolean | null = null;

    if (form === 'TRUE_FALSE') {
      if (typeof obj.trueIsCorrect === 'boolean') {
        trueIsCorrect = obj.trueIsCorrect;
      } else if (String(obj.correctAnswer || obj.answer).toLowerCase().startsWith('t')) {
        trueIsCorrect = true;
      } else if (String(obj.correctAnswer || obj.answer).toLowerCase().startsWith('f')) {
        trueIsCorrect = false;
      } else {
        errors.push('True/False questions must specify True or False as answer');
      }
    } else {
      if (options.length < 2) {
        errors.push('Multiple choice questions require at least 2 options');
      }
      if (typeof obj.correctOption === 'number' && obj.correctOption >= 0 && obj.correctOption < options.length) {
        correctOption = obj.correctOption;
      } else if (typeof obj.correctAnswer === 'string') {
        const letterIdx = ['a', 'b', 'c', 'd', 'e'].indexOf(obj.correctAnswer.trim().toLowerCase());
        if (letterIdx >= 0 && letterIdx < options.length) {
          correctOption = letterIdx;
        } else {
          const directMatch = options.findIndex((o) => o.toLowerCase() === obj.correctAnswer.trim().toLowerCase());
          if (directMatch >= 0) {
            correctOption = directMatch;
          } else {
            errors.push(`Invalid correct answer "${obj.correctAnswer}" for given options`);
          }
        }
      } else {
        errors.push('Multiple choice questions must specify a valid correct answer (A, B, C, D)');
      }
    }

    const question: ExamQuestionInput = {
      id: String(obj.id || `Q${rowNumber}`).trim(),
      form,
      topic: String(obj.topic || defaultTopic).trim() || defaultTopic,
      prompt,
      options: form === 'TRUE_FALSE' ? ['True', 'False'] : options,
      correctOption,
      trueIsCorrect,
      acceptedAnswers: Array.isArray(obj.acceptedAnswers) ? obj.acceptedAnswers.map(String) : [],
      answerDescription: obj.answerDescription || obj.explanation || '',
    };

    const rowResult: ParsedQuestionRow = {
      rowNumber,
      question,
      rawRecord: obj,
      isValid: errors.length === 0,
      errors,
    };

    if (rowResult.isValid) {
      validRows.push(rowResult);
    } else {
      invalidRows.push(rowResult);
    }
  });

  return {
    totalRows: items.length,
    validRows,
    invalidRows,
    allQuestions: validRows.map((r) => r.question),
  };
}

function parseCsvQuestions(csvText: string, defaultTopic: string): CsvParseResult {
  const delimiter = detectDelimiter(csvText);
  const rawLines = csvText.split(/\r?\n/).filter((l) => l.trim().length > 0);

  if (rawLines.length === 0) {
    return { totalRows: 0, validRows: [], invalidRows: [], allQuestions: [] };
  }

  // Parse header line
  const headerLine = rawLines[0]!;
  const rawHeaders = parseCsvLine(headerLine, delimiter);
  const cleanHeaders = rawHeaders.map(cleanHeader);

  // Map header indices
  let promptIdx = -1;
  let optAIdx = -1;
  let optBIdx = -1;
  let optCIdx = -1;
  let optDIdx = -1;
  let answerIdx = -1;
  let topicIdx = -1;
  let expIdx = -1;
  let idIdx = -1;
  let typeIdx = -1;

  cleanHeaders.forEach((h, i) => {
    if (h.includes('prompt') || h.includes('question') || h === 'text' || h === 'q') promptIdx = i;
    else if (h === 'optiona' || h === 'opta' || h === 'a' || h === 'choicea') optAIdx = i;
    else if (h === 'optionb' || h === 'optb' || h === 'b' || h === 'choiceb') optBIdx = i;
    else if (h === 'optionc' || h === 'optc' || h === 'c' || h === 'choicec') optCIdx = i;
    else if (h === 'optiond' || h === 'optd' || h === 'd' || h === 'choiced') optDIdx = i;
    else if (h.includes('answer') || h === 'correct' || h === 'key') answerIdx = i;
    else if (h.includes('topic') || h.includes('chapter') || h === 'subject') topicIdx = i;
    else if (h.includes('explain') || h.includes('explanation') || h.includes('description') || h === 'solution') expIdx = i;
    else if (h === 'id' || h === 'qid' || h === 'number' || h === 'no') idIdx = i;
    else if (h.includes('type') || h.includes('form')) typeIdx = i;
  });

  // Default fallback if headers did not match names at all (e.g. raw headerless data)
  const hasMatchedHeader = promptIdx !== -1 || answerIdx !== -1 || optAIdx !== -1;
  if (!hasMatchedHeader) {
    if (promptIdx === -1 && rawHeaders.length > 0) promptIdx = 0;
    if (optAIdx === -1 && rawHeaders.length > 1) optAIdx = 1;
    if (optBIdx === -1 && rawHeaders.length > 2) optBIdx = 2;
    if (optCIdx === -1 && rawHeaders.length > 3) optCIdx = 3;
    if (optDIdx === -1 && rawHeaders.length > 4) optDIdx = 4;
    if (answerIdx === -1 && rawHeaders.length > 5) answerIdx = 5;
  }

  const validRows: ParsedQuestionRow[] = [];
  const invalidRows: ParsedQuestionRow[] = [];

  for (let lineIndex = 1; lineIndex < rawLines.length; lineIndex++) {
    const rawLine = rawLines[lineIndex]!;
    const values = parseCsvLine(rawLine, delimiter);
    const rowNumber = lineIndex + 1;
    const errors: string[] = [];

    const prompt = (values[promptIdx] || '').trim();
    if (!prompt) {
      errors.push('Question prompt is required');
    }

    const rawType = (typeIdx >= 0 ? values[typeIdx] || '' : '').toUpperCase();
    const rawAnswer = (answerIdx >= 0 ? values[answerIdx] || '' : '').trim();
    const isTrueFalseType = rawType.includes('TRUE') || rawAnswer.toLowerCase() === 'true' || rawAnswer.toLowerCase() === 'false';

    let form: ExamQuestionInput['form'] = isTrueFalseType ? 'TRUE_FALSE' : 'MULTIPLE_CHOICE';
    if (rawType.includes('SHORT')) form = 'SHORT_ANSWER';

    const options: string[] = [];
    if (form === 'TRUE_FALSE') {
      options.push('True', 'False');
    } else {
      if (optAIdx >= 0 && values[optAIdx]) options.push(values[optAIdx]!.trim());
      if (optBIdx >= 0 && values[optBIdx]) options.push(values[optBIdx]!.trim());
      if (optCIdx >= 0 && values[optCIdx]) options.push(values[optCIdx]!.trim());
      if (optDIdx >= 0 && values[optDIdx]) options.push(values[optDIdx]!.trim());
    }

    let correctOption: number | null = null;
    let trueIsCorrect: boolean | null = null;

    if (form === 'TRUE_FALSE') {
      const lower = rawAnswer.toLowerCase();
      if (lower.startsWith('t') || lower === '1') {
        trueIsCorrect = true;
      } else if (lower.startsWith('f') || lower === '0') {
        trueIsCorrect = false;
      } else {
        errors.push(`True/False question expects 'True' or 'False', got: "${rawAnswer}"`);
      }
    } else {
      if (options.length < 2) {
        errors.push(`Multiple choice questions need at least 2 options (found ${options.length})`);
      }

      const cleanAns = rawAnswer.toUpperCase();
      if (cleanAns === 'A' || cleanAns === '1') correctOption = 0;
      else if (cleanAns === 'B' || cleanAns === '2') correctOption = 1;
      else if (cleanAns === 'C' || cleanAns === '3') correctOption = 2;
      else if (cleanAns === 'D' || cleanAns === '4') correctOption = 3;
      else {
        // Try verbatim option text matching
        const matchIdx = options.findIndex((opt) => opt.toLowerCase() === rawAnswer.toLowerCase());
        if (matchIdx >= 0) {
          correctOption = matchIdx;
        } else {
          errors.push(`Invalid correct answer letter "${rawAnswer}". Specify A, B, C, or D`);
        }
      }

      if (correctOption !== null && correctOption >= options.length) {
        errors.push(`Correct option index (${correctOption + 1}) exceeds available options count (${options.length})`);
      }
    }

    const topic = (topicIdx >= 0 ? values[topicIdx] || '' : '').trim() || defaultTopic;
    const explanation = (expIdx >= 0 ? values[expIdx] || '' : '').trim();
    const id = (idIdx >= 0 ? values[idIdx] || '' : '').trim() || `Q${rowNumber - 1}`;

    const rawRecord: Record<string, string> = {};
    rawHeaders.forEach((h, i) => {
      rawRecord[h] = values[i] || '';
    });

    const question: ExamQuestionInput = {
      id,
      form,
      topic,
      prompt,
      options,
      correctOption,
      trueIsCorrect,
      acceptedAnswers: [],
      answerDescription: explanation || undefined,
    };

    const rowResult: ParsedQuestionRow = {
      rowNumber,
      question,
      rawRecord,
      isValid: errors.length === 0,
      errors,
    };

    if (rowResult.isValid) {
      validRows.push(rowResult);
    } else {
      invalidRows.push(rowResult);
    }
  }

  return {
    totalRows: rawLines.length - 1,
    validRows,
    invalidRows,
    allQuestions: validRows.map((r) => r.question),
  };
}

/**
 * Returns a ready-to-download CSV template with sample multiple choice & true/false questions.
 */
export function getSampleCsvTemplate(): string {
  return [
    'Question,Option A,Option B,Option C,Option D,Correct Answer,Topic,Explanation',
    '"What is the SI unit of electric resistance?","Volt","Ohm","Watt","Ampere","B","Electricity & Magnetism","The ohm (symbol: Ω) is the SI unit of electrical resistance."',
    '"Newton\'s first law of motion states that an object at rest remains at rest unless acted on by an external force.","True","False","","","True","Mechanics","This is the law of inertia."',
    '"What is the derivative of f(x) = x^3 - 4x + 7?","3x^2 - 4","3x^2 - 4x","3x^2 + 7","x^2 - 4","A","Calculus","f\'(x) = d/dx(x^3) - d/dx(4x) + d/dx(7) = 3x^2 - 4."',
    '"Which data structure follows the First-In, First-Out (FIFO) principle?","Stack","Queue","Binary Tree","Priority Queue","B","Data Structures","A Queue operates strictly on a FIFO basis."',
  ].join('\n');
}

export const generateSampleCsvTemplate = getSampleCsvTemplate;

