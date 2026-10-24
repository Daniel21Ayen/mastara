import { BadRequestException } from "@nestjs/common";

export interface QuestionImportRow {
  rowNumber: number;
  id?: string;
  type: "MULTIPLE_CHOICE" | "TRUE_FALSE" | "SHORT_ANSWER" | "BLANK_SPACE";
  topic?: string;
  prompt: string;
  options: string[];
  correctAnswer: string;
  correctOptionIndex?: number;
  explanation?: string;
}

export interface ImportError {
  row: number;
  field: string;
  message: string;
  rawContent?: string;
}

export interface CsvImportResult {
  valid: boolean;
  totalRows: number;
  validRows: number;
  errorRows: number;
  questions: QuestionImportRow[];
  errors: ImportError[];
  errorReportCsv?: string;
}

export interface ImportOptions {
  dryRun?: boolean;
  atomic?: boolean;
  maxRows?: number;
  maxSizeBytes?: number;
}

const DEFAULT_MAX_ROWS = 1000;
const DEFAULT_MAX_SIZE = 5 * 1024 * 1024; // 5 MB

/**
 * Standard CSV Template Columns
 */
export const REQUIRED_CSV_TEMPLATE_HEADERS = [
  "prompt",
  "type",
  "option_a",
  "option_b",
  "correct_answer",
];

export const FULL_CSV_TEMPLATE = `id,type,topic,prompt,option_a,option_b,option_c,option_d,correct_answer,explanation
Q1,MULTIPLE_CHOICE,Physics,የመጀመሪያው የኒውተን ሕግ ምን ይባላል?,የፍጥነት ሕግ,የ inertia ሕግ,የኃይል ሕግ,የስበት ሕግ,B,Inertia describes resistance to change in motion
Q2,MULTIPLE_CHOICE,Mathematics,"Given $f(x) = \\frac{a, b}{c}$, what is $f'(x)$?","$a/c$","$b/c$","0","undefined",A,Derivative of constant fraction
Q3,TRUE_FALSE,History,የዓድዋ ጦርነት የተካሄደው በ1888 ዓ.ም ነው?,True,False,,,True,Battle of Adwa took place in 1896 (1888 E.C.)
Q4,BLANK_SPACE,Chemistry,ውሃ የተሠራው ከሃይድሮጅንና ከ___ ነው?,,,,ኦክስጅን,Water is composed of hydrogen and oxygen
`;

/**
 * Sanitize formula injection from CSV cell values (=, +, -, @)
 */
export function sanitizeFormulaInjection(value: string): string {
  if (!value) return "";
  const trimmed = value.trim();
  if (
    trimmed.startsWith("=") ||
    trimmed.startsWith("+") ||
    trimmed.startsWith("-") ||
    trimmed.startsWith("@")
  ) {
    return `'${trimmed}`;
  }
  return trimmed;
}

/**
 * Robust RFC 4180 CSV parser supporting Amharic Unicode, multiline cells, quotes, and commas.
 */
export function parseRfc4180Csv(text: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = "";
  let inQuotes = false;
  let i = 0;

  while (i < text.length) {
    const ch = text[i];
    const next = i + 1 < text.length ? text[i + 1] : "";

    if (inQuotes) {
      if (ch === '"' && next === '"') {
        currentCell += '"';
        i += 2;
        continue;
      }
      if (ch === '"') {
        inQuotes = false;
        i++;
        continue;
      }
      currentCell += ch;
      i++;
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
      i++;
      continue;
    }

    if (ch === ",") {
      currentRow.push(currentCell);
      currentCell = "";
      i++;
      continue;
    }

    if (ch === "\r" && next === "\n") {
      currentRow.push(currentCell);
      rows.push(currentRow);
      currentRow = [];
      currentCell = "";
      i += 2;
      continue;
    }

    if (ch === "\n" || ch === "\r") {
      currentRow.push(currentCell);
      rows.push(currentRow);
      currentRow = [];
      currentCell = "";
      i++;
      continue;
    }

    currentCell += ch;
    i++;
  }

  if (currentCell.length > 0 || currentRow.length > 0) {
    currentRow.push(currentCell);
    rows.push(currentRow);
  }

  return rows.filter((r) => r.some((cell) => cell.trim().length > 0));
}

/**
 * Validate and parse questions from raw uploaded CSV buffer.
 */
export function parseAndValidateCsvQuestions(
  buffer: Buffer,
  options: ImportOptions = {},
): CsvImportResult {
  const maxBytes = options.maxSizeBytes || DEFAULT_MAX_SIZE;
  const maxRows = options.maxRows || DEFAULT_MAX_ROWS;

  // 1. Enforce size limit
  if (buffer.length > maxBytes) {
    throw new BadRequestException({
      errorCode: "FILE_TOO_LARGE",
      message: `CSV file size exceeds the allowed limit of ${Math.round(maxBytes / (1024 * 1024))} MB.`,
    });
  }

  // 2. Reject by content (Block %PDF and PK zip/xlsx)
  if (buffer.length >= 4) {
    // Check %PDF: 0x25 0x50 0x44 0x46
    if (
      buffer[0] === 0x25 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x44 &&
      buffer[3] === 0x46
    ) {
      throw new BadRequestException({
        errorCode: "INVALID_FILE_CONTENT",
        message: "PDF file content detected. Only genuine UTF-8 CSV files are accepted.",
      });
    }

    // Check PK (Zip / Excel XLSX): 0x50 0x4B
    if (buffer[0] === 0x50 && buffer[1] === 0x4b) {
      throw new BadRequestException({
        errorCode: "INVALID_FILE_CONTENT",
        message: "Excel workbook (.xlsx) or ZIP archive content detected. Please export as genuine UTF-8 CSV.",
      });
    }
  }

  // 3. Handle UTF-8 and strip BOM (0xEF, 0xBB, 0xBF)
  let cleanBuffer = buffer;
  if (
    cleanBuffer.length >= 3 &&
    cleanBuffer[0] === 0xef &&
    cleanBuffer[1] === 0xbb &&
    cleanBuffer[2] === 0xbf
  ) {
    cleanBuffer = cleanBuffer.subarray(3);
  }

  const rawText = cleanBuffer.toString("utf-8");

  // Validate UTF-8 integrity (check for replacement character corruption)
  if (rawText.includes("\uFFFD")) {
    throw new BadRequestException({
      errorCode: "ENCODING_ERROR",
      message: "CSV contains invalid or corrupted character encodings. Please save your file as genuine UTF-8.",
    });
  }

  // 4. Parse CSV rows
  const parsedRows = parseRfc4180Csv(rawText);
  if (parsedRows.length === 0) {
    throw new BadRequestException({
      errorCode: "EMPTY_FILE",
      message: "The uploaded CSV file contains no data rows.",
    });
  }

  // 5. Header validation
  const headerRow = parsedRows[0]!.map((h) => h.trim().toLowerCase());
  const findCol = (...names: string[]) => {
    for (const name of names) {
      const idx = headerRow.indexOf(name.toLowerCase());
      if (idx !== -1) return idx;
    }
    return -1;
  };

  const promptCol = findCol("prompt", "question", "text", "question_text");
  const typeCol = findCol("type", "form", "question_type");
  const correctCol = findCol("correct_answer", "correct", "answer", "correct_option");
  const idCol = findCol("id", "question_id", "no");
  const topicCol = findCol("topic", "chapter", "category");
  const explanationCol = findCol("explanation", "solution", "rationale");
  const optACol = findCol("option_a", "optiona", "a");
  const optBCol = findCol("option_b", "optionb", "b");
  const optCCol = findCol("option_c", "optionc", "c");
  const optDCol = findCol("option_d", "optiond", "d");

  const missingHeaders: string[] = [];
  if (promptCol === -1) missingHeaders.push("prompt");
  if (typeCol === -1) missingHeaders.push("type");
  if (correctCol === -1) missingHeaders.push("correct_answer");

  if (missingHeaders.length > 0) {
    throw new BadRequestException({
      errorCode: "INVALID_HEADER_TEMPLATE",
      message: `CSV headers do not match required template. Missing column(s): ${missingHeaders.join(", ")}. Please download the template.`,
    });
  }

  const dataRows = parsedRows.slice(1);
  if (dataRows.length > maxRows) {
    throw new BadRequestException({
      errorCode: "ROW_LIMIT_EXCEEDED",
      message: `CSV row count (${dataRows.length}) exceeds the maximum allowed limit of ${maxRows} rows per import.`,
    });
  }

  const questions: QuestionImportRow[] = [];
  const errors: ImportError[] = [];

  // 6. Validate each row
  dataRows.forEach((row, idx) => {
    const rowNum = idx + 2; // 1-indexed, header is row 1
    const getCell = (colIdx: number) =>
      colIdx !== -1 && colIdx < row.length ? sanitizeFormulaInjection(row[colIdx]!) : "";

    const rawPrompt = getCell(promptCol);
    const rawType = getCell(typeCol).toUpperCase();
    const rawCorrect = getCell(correctCol);
    const rawId = getCell(idCol) || `Q${idx + 1}`;
    const rawTopic = getCell(topicCol);
    const rawExplanation = getCell(explanationCol);

    const optA = getCell(optACol);
    const optB = getCell(optBCol);
    const optC = getCell(optCCol);
    const optD = getCell(optDCol);
    const options = [optA, optB, optC, optD].filter((o) => o.length > 0);

    // Validate prompt
    if (!rawPrompt) {
      errors.push({
        row: rowNum,
        field: "prompt",
        message: "Question prompt cannot be empty.",
        rawContent: row.join(","),
      });
      return;
    }

    // Validate type / form
    let normalizedType: QuestionImportRow["type"] = "MULTIPLE_CHOICE";
    if (rawType.includes("TRUE") || rawType === "TF") {
      normalizedType = "TRUE_FALSE";
    } else if (rawType.includes("SHORT") || rawType === "SA") {
      normalizedType = "SHORT_ANSWER";
    } else if (rawType.includes("BLANK") || rawType.includes("FILL")) {
      normalizedType = "BLANK_SPACE";
    } else if (rawType.includes("CHOICE") || rawType === "MC") {
      normalizedType = "MULTIPLE_CHOICE";
    } else {
      errors.push({
        row: rowNum,
        field: "type",
        message: `Invalid question type '${rawType}'. Must be MULTIPLE_CHOICE, TRUE_FALSE, SHORT_ANSWER, or BLANK_SPACE.`,
        rawContent: row.join(","),
      });
      return;
    }

    // Type-specific validations
    let correctOptionIndex: number | undefined;

    if (normalizedType === "MULTIPLE_CHOICE") {
      if (options.length < 2) {
        errors.push({
          row: rowNum,
          field: "options",
          message: "Multiple choice questions require at least 2 options (option_a and option_b).",
          rawContent: row.join(","),
        });
        return;
      }

      // Check correct answer
      const letterMap: Record<string, number> = { A: 0, B: 1, C: 2, D: 3 };
      const upperCorrect = rawCorrect.toUpperCase();
      if (upperCorrect in letterMap) {
        correctOptionIndex = letterMap[upperCorrect];
      } else {
        const num = parseInt(rawCorrect, 10);
        if (!isNaN(num) && num >= 1 && num <= options.length) {
          correctOptionIndex = num - 1;
        } else {
          // Check matching option text
          const foundIdx = options.findIndex((opt) => opt.toLowerCase() === rawCorrect.toLowerCase());
          if (foundIdx !== -1) {
            correctOptionIndex = foundIdx;
          }
        }
      }

      if (correctOptionIndex === undefined || correctOptionIndex >= options.length) {
        errors.push({
          row: rowNum,
          field: "correct_answer",
          message: `Correct answer '${rawCorrect}' is invalid. Must be A, B, C, D or match one of the available options.`,
          rawContent: row.join(","),
        });
        return;
      }
    } else if (normalizedType === "TRUE_FALSE") {
      const lower = rawCorrect.toLowerCase();
      if (lower !== "true" && lower !== "false" && lower !== "t" && lower !== "f") {
        errors.push({
          row: rowNum,
          field: "correct_answer",
          message: `Correct answer '${rawCorrect}' is invalid for True/False question. Must be True or False.`,
          rawContent: row.join(","),
        });
        return;
      }
    } else if (normalizedType === "BLANK_SPACE") {
      if (!rawPrompt.includes("___")) {
        errors.push({
          row: rowNum,
          field: "prompt",
          message: "Fill-in-the-blank questions must contain three underscores ('___') marking the blank.",
          rawContent: row.join(","),
        });
        return;
      }
    }

    questions.push({
      rowNumber: rowNum,
      id: rawId,
      type: normalizedType,
      topic: rawTopic || undefined,
      prompt: rawPrompt,
      options,
      correctAnswer: rawCorrect,
      correctOptionIndex,
      explanation: rawExplanation || undefined,
    });
  });

  const valid = errors.length === 0;

  // Generate downloadable error report CSV if errors exist
  let errorReportCsv: string | undefined;
  if (errors.length > 0) {
    const errorReportRows = [
      ["row", "field", "error_message", "raw_content"].join(","),
      ...errors.map((e) =>
        [
          e.row,
          JSON.stringify(e.field),
          JSON.stringify(e.message),
          JSON.stringify(e.rawContent || ""),
        ].join(","),
      ),
    ];
    errorReportCsv = errorReportRows.join("\n");
  }

  return {
    valid,
    totalRows: dataRows.length,
    validRows: questions.length,
    errorRows: new Set(errors.map((e) => e.row)).size,
    questions,
    errors,
    errorReportCsv,
  };
}
