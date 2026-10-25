// packages/domain/src/assessment/bulkQuestionParser.ts
import {
  EXAM_PROMPT_MAX,
  EXAM_TOPIC_MAX,
  OPTIONS_MAX,
  OPTIONS_MIN,
  QUESTION_FORMS,
  BLANK_MARKER,
} from '../constants/admin';
import type { QuestionForm } from '../constants/admin';
import { parseMath } from '../math/parseMath';
import { questionProblems } from './questionRules';
import { parseCsv } from './csvParser';

export interface BulkImportRowError {
  row: number;
  questionId?: string;
  field: string;
  message: string;
}

export interface ParsedExamQuestion {
  id: string;
  form: QuestionForm;
  topic: string;
  prompt: string;
  options: string[];
  correctOption: number | null;
  trueIsCorrect: boolean | null;
  acceptedAnswers: string[];
  answerDescription?: string;
}

export interface BulkQuestionParseResult {
  totalRows: number;
  validRows: number;
  errorRows: number;
  errors: BulkImportRowError[];
  questions: ParsedExamQuestion[];
}

/** Check KaTeX delimiters and balanced braces */
export function validateKatexSyntax(text: string): string | null {
  if (!text) return null;

  let unescapedDollarCount = 0;
  for (let i = 0; i < text.length; i++) {
    if (text[i] === '$') {
      if (i > 0 && text[i - 1] === '\\') {
        continue;
      }
      unescapedDollarCount++;
    }
  }

  if (unescapedDollarCount % 2 !== 0) {
    return 'Unmatched LaTeX delimiter ($). Every opening $ or $$ must have a closing pair.';
  }

  const segments = parseMath(text);
  for (const seg of segments) {
    if (seg.kind === 'math') {
      let braces = 0;
      for (let j = 0; j < seg.value.length; j++) {
        const ch = seg.value[j];
        const prev = j > 0 ? seg.value[j - 1] : '';
        if (ch === '{' && prev !== '\\') {
          braces++;
        } else if (ch === '}' && prev !== '\\') {
          braces--;
          if (braces < 0) {
            return `Unmatched closing brace '}' in formula: $${seg.value}$`;
          }
        }
      }
      if (braces !== 0) {
        return `Unclosed opening brace '{' in formula: $${seg.value}$`;
      }
    }
  }

  return null;
}

function normalizeForm(raw: string | undefined): QuestionForm {
  if (!raw) return 'MULTIPLE_CHOICE';
  const val = raw.trim().toUpperCase().replace(/[-\s]/g, '_');
  if (val === 'MC' || val === 'CHOICE' || val === 'SINGLE' || val === 'MULTIPLE_CHOICE') {
    return 'MULTIPLE_CHOICE';
  }
  if (val === 'TF' || val === 'TRUE_FALSE' || val === 'TRUEFALSE') {
    return 'TRUE_FALSE';
  }
  if (val === 'SA' || val === 'SHORT' || val === 'SHORT_ANSWER') {
    return 'SHORT_ANSWER';
  }
  if (val === 'BLANK' || val === 'BLANK_SPACE' || val === 'FILL_BLANK') {
    return 'BLANK_SPACE';
  }
  return 'MULTIPLE_CHOICE';
}

function parseCorrectOption(val: string | number | undefined, optionsLength: number): number | null {
  if (val === undefined || val === null) return null;
  const str = String(val).trim().toUpperCase();
  if (str === '') return null;

  // Letter: A=0, B=1, C=2, D=3, E=4, F=5
  const letters = ['A', 'B', 'C', 'D', 'E', 'F'];
  const letterIdx = letters.indexOf(str);
  if (letterIdx !== -1) {
    return letterIdx < optionsLength ? letterIdx : null;
  }

  const num = parseInt(str, 10);
  if (!isNaN(num)) {
    // 0-indexed (0 to len-1)
    if (num >= 0 && num < optionsLength) return num;
    // 1-indexed (1 to len)
    if (num >= 1 && num <= optionsLength) return num - 1;
  }

  return null;
}

function parseTrueFalse(val: string | boolean | undefined): boolean | null {
  if (val === undefined || val === null) return null;
  if (typeof val === 'boolean') return val;
  const str = String(val).trim().toLowerCase();
  if (str === 'true' || str === 't' || str === 'yes' || str === 'y' || str === '1') return true;
  if (str === 'false' || str === 'f' || str === 'no' || str === 'n' || str === '0') return false;
  return null;
}

/**
 * Neutralizes potential CSV formula injection in string cells (FR-G54).
 * Cells starting with =, +, -, @, or tabs are escaped with a leading single quote.
 */
export function neutralizeFormulaInjection(val: string): string {
  if (!val) return val;
  const trimmed = val.trim();
  // Do not neutralize negative numbers if they are strictly numeric values
  if (/^-[0-9.]+$/.test(trimmed)) {
    return val;
  }
  const firstChar = trimmed[0];
  if (
    firstChar &&
    ('=+@\t\r'.includes(firstChar) || (firstChar === '-' && !/^[0-9]/.test(trimmed.slice(1))))
  ) {
    return `'${val}`;
  }
  return val;
}

/**
 * Parses raw CSV text or structured JSON into validated questions.
 */
export function parseBulkQuestions(input: string | unknown[]): BulkQuestionParseResult {
  const errors: BulkImportRowError[] = [];
  const questions: ParsedExamQuestion[] = [];
  const seenIds = new Map<string, number>();

  if (typeof input === 'string') {
    const trimmed = input.trim();
    if (!trimmed) {
      return { totalRows: 0, validRows: 0, errorRows: 0, errors: [], questions: [] };
    }

    // FR-G50: Only CSV is accepted. The server checks content, not extension/MIME.
    // Content beginning with %PDF or PK (zip, xlsx, docx) is rejected.
    if (
      trimmed.startsWith('%PDF') ||
      trimmed.startsWith('PK\x03\x04') ||
      trimmed.startsWith('PK')
    ) {
      return {
        totalRows: 0,
        validRows: 0,
        errorRows: 1,
        errors: [
          {
            row: 0,
            field: 'file',
            message:
              'Invalid file content: PDF, Excel (.xlsx) and binary files are rejected. Upload UTF-8 CSV only.',
          },
        ],
        questions: [],
      };
    }

    // Try parsing as JSON first if it begins with [ or {
    if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
      try {
        const parsed = JSON.parse(trimmed);
        const arrayData = Array.isArray(parsed) ? parsed : parsed.questions ?? [];
        if (Array.isArray(arrayData)) {
          return parseBulkQuestions(arrayData);
        }
      } catch {
        // Fall back to CSV parser
      }
    }

    const csvRows = parseCsv(trimmed);
    if (csvRows.length === 0) {
      return { totalRows: 0, validRows: 0, errorRows: 0, errors: [], questions: [] };
    }

    // Header matching
    const headerRow = csvRows[0]!.map((h) => h.trim().toLowerCase());
    const findCol = (...aliases: string[]): number => {
      for (const alias of aliases) {
        const idx = headerRow.indexOf(alias.toLowerCase());
        if (idx !== -1) return idx;
      }
      return -1;
    };

    const idCol = findCol('id', 'question_id', 'questionid', 'qid', 'no', 'number');
    const formCol = findCol('form', 'type', 'question_type', 'kind');
    const topicCol = findCol('topic', 'chapter', 'unit', 'category');
    const promptCol = findCol('prompt', 'question', 'text', 'question_text', 'title');
    const optACol = findCol('option_a', 'optiona', 'option_1', 'option1', 'a');
    const optBCol = findCol('option_b', 'optionb', 'option_2', 'option2', 'b');
    const optCCol = findCol('option_c', 'optionc', 'option_3', 'option3', 'c');
    const optDCol = findCol('option_d', 'optiond', 'option_4', 'option4', 'd');
    const optECol = findCol('option_e', 'optione', 'option_5', 'option5', 'e');
    const optFCol = findCol('option_f', 'optionf', 'option_6', 'option6', 'f');
    const optsCombinedCol = findCol('options', 'choices');
    const correctCol = findCol('correct', 'correct_option', 'correct_answer', 'answer', 'key');
    const explanationCol = findCol(
      'explanation',
      'solution',
      'rationale',
      'answer_description',
      'description',
    );

    const dataRows = csvRows.slice(1);
    const totalRows = dataRows.length;

    dataRows.forEach((row, rowIdx) => {
      const rowNum = rowIdx + 2; // 1-indexed, accounting for header row
      const getVal = (col: number) => (col !== -1 && col < row.length ? row[col]!.trim() : '');

      let rawId = getVal(idCol);
      if (!rawId) {
        rawId = `Q${rowIdx + 1}`;
      }

      const form = normalizeForm(getVal(formCol));
      const topic = getVal(topicCol);
      const prompt = getVal(promptCol);
      const explanation = getVal(explanationCol);

      // Collect options
      let options: string[] = [];
      if (optsCombinedCol !== -1 && getVal(optsCombinedCol)) {
        options = getVal(optsCombinedCol)
          .split(/[|;]/)
          .map((opt) => opt.trim())
          .filter(Boolean);
      } else {
        const optA = getVal(optACol);
        const optB = getVal(optBCol);
        const optC = getVal(optCCol);
        const optD = getVal(optDCol);
        const optE = getVal(optECol);
        const optF = getVal(optFCol);
        if (optA) options.push(optA);
        if (optB) options.push(optB);
        if (optC) options.push(optC);
        if (optD) options.push(optD);
        if (optE) options.push(optE);
        if (optF) options.push(optF);
      }

      const rawCorrect = getVal(correctCol);
      let correctOption: number | null = null;
      let trueIsCorrect: boolean | null = null;
      let acceptedAnswers: string[] = [];

      if (form === 'MULTIPLE_CHOICE') {
        correctOption = parseCorrectOption(rawCorrect, options.length);
      } else if (form === 'TRUE_FALSE') {
        trueIsCorrect = parseTrueFalse(rawCorrect);
      } else {
        acceptedAnswers = rawCorrect
          .split(/[,|;]/)
          .map((a) => a.trim())
          .filter(Boolean);
      }

      validateAndPush({
        rowNum,
        rawId,
        form,
        topic,
        prompt,
        options,
        correctOption,
        trueIsCorrect,
        acceptedAnswers,
        rawCorrect,
        explanation,
        seenIds,
        errors,
        questions,
      });
    });

    const errorRowSet = new Set(errors.map((e) => e.row));
    return {
      totalRows,
      validRows: questions.length,
      errorRows: errorRowSet.size,
      errors,
      questions,
    };
  }

  // Structured Array input
  if (Array.isArray(input)) {
    const totalRows = input.length;

    input.forEach((item: any, rowIdx) => {
      const rowNum = rowIdx + 1;
      let rawId = String(item.id ?? item.question_id ?? `Q${rowIdx + 1}`).trim();
      const form = normalizeForm(item.form ?? item.type);
      const topic = String(item.topic ?? '').trim();
      const prompt = String(item.prompt ?? item.question ?? '').trim();
      const explanation = item.answerDescription ?? item.explanation ?? item.description;

      let options: string[] = [];
      if (Array.isArray(item.options)) {
        options = item.options.map((o: any) => String(o).trim()).filter(Boolean);
      }

      let correctOption: number | null = null;
      let trueIsCorrect: boolean | null = null;
      let acceptedAnswers: string[] = [];

      if (form === 'MULTIPLE_CHOICE') {
        correctOption = parseCorrectOption(item.correctOption ?? item.correct, options.length);
      } else if (form === 'TRUE_FALSE') {
        trueIsCorrect = parseTrueFalse(item.trueIsCorrect ?? item.correct);
      } else {
        if (Array.isArray(item.acceptedAnswers)) {
          acceptedAnswers = item.acceptedAnswers.map((a: any) => String(a).trim()).filter(Boolean);
        } else if (item.correct !== undefined) {
          acceptedAnswers = String(item.correct)
            .split(/[,|;]/)
            .map((a) => a.trim())
            .filter(Boolean);
        }
      }

      validateAndPush({
        rowNum,
        rawId,
        form,
        topic,
        prompt,
        options,
        correctOption,
        trueIsCorrect,
        acceptedAnswers,
        rawCorrect: String(item.correct ?? ''),
        explanation: explanation ? String(explanation).trim() : undefined,
        seenIds,
        errors,
        questions,
      });
    });

    const errorRowSet = new Set(errors.map((e) => e.row));
    return {
      totalRows,
      validRows: questions.length,
      errorRows: errorRowSet.size,
      errors,
      questions,
    };
  }

  return { totalRows: 0, validRows: 0, errorRows: 0, errors: [], questions: [] };
}

interface ValidateAndPushParams {
  rowNum: number;
  rawId: string;
  form: QuestionForm;
  topic: string;
  prompt: string;
  options: string[];
  correctOption: number | null;
  trueIsCorrect: boolean | null;
  acceptedAnswers: string[];
  rawCorrect: string;
  explanation?: string;
  seenIds: Map<string, number>;
  errors: BulkImportRowError[];
  questions: ParsedExamQuestion[];
}

function validateAndPush(params: ValidateAndPushParams): void {
  const {
    rowNum,
    rawId,
    form,
    topic,
    prompt,
    options,
    correctOption,
    trueIsCorrect,
    acceptedAnswers,
    rawCorrect,
    explanation,
    seenIds,
    errors,
    questions,
  } = params;

  let hasRowError = false;

  // 1. Question ID format check
  if (!rawId || !/^[A-Za-z0-9][A-Za-z0-9_-]{1,39}$/.test(rawId)) {
    errors.push({
      row: rowNum,
      questionId: rawId,
      field: 'id',
      message: 'Question ID must be 2-40 characters alphanumeric with dashes or underscores.',
    });
    hasRowError = true;
  } else if (seenIds.has(rawId.toLowerCase())) {
    errors.push({
      row: rowNum,
      questionId: rawId,
      field: 'id',
      message: `Duplicate Question ID '${rawId}' (first used on row ${seenIds.get(rawId.toLowerCase())}).`,
    });
    hasRowError = true;
  } else {
    seenIds.set(rawId.toLowerCase(), rowNum);
  }

  // 2. Prompt length & presence
  if (!prompt) {
    errors.push({
      row: rowNum,
      questionId: rawId,
      field: 'prompt',
      message: 'Question prompt cannot be empty.',
    });
    hasRowError = true;
  } else if (prompt.length > EXAM_PROMPT_MAX) {
    errors.push({
      row: rowNum,
      questionId: rawId,
      field: 'prompt',
      message: `Prompt exceeds maximum length of ${EXAM_PROMPT_MAX} characters (${prompt.length}).`,
    });
    hasRowError = true;
  }

  // 3. LaTeX Math syntax in prompt & explanation
  const promptMathErr = validateKatexSyntax(prompt);
  if (promptMathErr) {
    errors.push({
      row: rowNum,
      questionId: rawId,
      field: 'prompt',
      message: promptMathErr,
    });
    hasRowError = true;
  }

  if (explanation) {
    const explMathErr = validateKatexSyntax(explanation);
    if (explMathErr) {
      errors.push({
        row: rowNum,
        questionId: rawId,
        field: 'explanation',
        message: explMathErr,
      });
      hasRowError = true;
    }
  }

  // 4. Topic length
  if (topic.length > EXAM_TOPIC_MAX) {
    errors.push({
      row: rowNum,
      questionId: rawId,
      field: 'topic',
      message: `Topic exceeds maximum length of ${EXAM_TOPIC_MAX} characters.`,
    });
    hasRowError = true;
  }

  // 5. Options & Correct Answer Validation
  const draft = {
    form,
    prompt,
    options,
    correctOption,
    trueIsCorrect,
    acceptedAnswers,
  };
  const problems = questionProblems(draft);

  if (form === 'MULTIPLE_CHOICE') {
    if (options.length < OPTIONS_MIN || options.length > OPTIONS_MAX) {
      errors.push({
        row: rowNum,
        questionId: rawId,
        field: 'options',
        message: `Multiple choice question must have between ${OPTIONS_MIN} and ${OPTIONS_MAX} options (found ${options.length}).`,
      });
      hasRowError = true;
    } else if (problems.includes('options')) {
      errors.push({
        row: rowNum,
        questionId: rawId,
        field: 'options',
        message: 'Options must be distinct and non-empty.',
      });
      hasRowError = true;
    }

    if (correctOption === null) {
      errors.push({
        row: rowNum,
        questionId: rawId,
        field: 'correct',
        message: `Valid correct choice required (A, B, C, D... or index 0-${options.length - 1}). Got '${rawCorrect}'.`,
      });
      hasRowError = true;
    }
  } else if (form === 'TRUE_FALSE') {
    if (trueIsCorrect === null) {
      errors.push({
        row: rowNum,
        questionId: rawId,
        field: 'correct',
        message: `True/False question requires TRUE or FALSE as answer. Got '${rawCorrect}'.`,
      });
      hasRowError = true;
    }
  } else if (form === 'BLANK_SPACE') {
    if (!prompt.includes(BLANK_MARKER)) {
      errors.push({
        row: rowNum,
        questionId: rawId,
        field: 'prompt',
        message: `Blank space question prompt must contain '${BLANK_MARKER}'.`,
      });
      hasRowError = true;
    }
    if (acceptedAnswers.length === 0) {
      errors.push({
        row: rowNum,
        questionId: rawId,
        field: 'correct',
        message: 'Blank space question requires at least one accepted answer.',
      });
      hasRowError = true;
    }
  } else if (form === 'SHORT_ANSWER') {
    if (acceptedAnswers.length === 0) {
      errors.push({
        row: rowNum,
        questionId: rawId,
        field: 'correct',
        message: 'Short answer question requires at least one accepted answer.',
      });
      hasRowError = true;
    }
  }

  if (!hasRowError) {
    questions.push({
      id: rawId,
      form,
      topic: neutralizeFormulaInjection(topic),
      prompt: neutralizeFormulaInjection(prompt),
      options: options.map(neutralizeFormulaInjection),
      correctOption,
      trueIsCorrect,
      acceptedAnswers: acceptedAnswers.map(neutralizeFormulaInjection),
      answerDescription: explanation ? neutralizeFormulaInjection(explanation) : undefined,
    });
  }
}

/** Generates an educator-ready CSV template with sample questions */
export function generateQuestionCsvTemplate(): string {
  return [
    'id,form,topic,prompt,option_a,option_b,option_c,option_d,correct,explanation',
    'Q1,MULTIPLE_CHOICE,Mechanics,"What is the SI unit of force? $F = ma$",Joule,Newton,Pascal,Watt,B,"Force is measured in Newtons (N), defined as $1 N = 1 kg \\cdot m/s^2$."',
    'Q2,MULTIPLE_CHOICE,Thermodynamics,"Calculate the work done $W = P \\Delta V$ when $P = 2 \\times 10^5$ Pa and $\\Delta V = 0.5$ m$^3$.",100 kJ,50 kJ,200 kJ,10 kJ,A,"Work done is $W = 2 \\times 10^5 \\times 0.5 = 10^5$ J = 100 kJ."',
    'Q3,TRUE_FALSE,Calculus,"The derivative of $\\sin(x)$ with respect to $x$ is $\\cos(x)$.",,,,,TRUE,"By definition, $\\frac{d}{dx}\\sin(x) = \\cos(x)$."',
    'Q4,SHORT_ANSWER,Electromagnetism,"What physical quantity has the unit Tesla ($T$)?",,,,,Magnetic Field,"Magnetic flux density or magnetic field is measured in Teslas."',
    `Q5,BLANK_SPACE,Optics,"The phenomenon where light bends as it passes from one medium to another is called ${BLANK_MARKER}.",,,,,refraction,"Light changes speed and bends according to Snell's law."`,
  ].join('\n');
}

