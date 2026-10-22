// packages/domain/src/assessment/examSetExport.ts
import type { QuestionForm } from '../constants/admin';

export interface ExportableExamQuestion {
  id: string;
  form: QuestionForm;
  topic: string;
  prompt: string;
  options: readonly string[];
  correctOption: number | null;
  trueIsCorrect: boolean | null;
  acceptedAnswers: readonly string[];
  answerDescription?: string;
}

export interface ExportableExamSet {
  id: string;
  kind: string;
  universityName?: string;
  programName?: string;
  courseTitle?: string | null;
  courseCode?: string | null;
  year?: number;
  semesterNumber?: number;
  stream?: string;
  minutes: number;
  questions: readonly ExportableExamQuestion[];
}

export interface HtmlExportOptions {
  includeAnswers?: boolean;
  autoprint?: boolean;
}

function escapeCsvCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function escapeHtml(text: unknown): string {
  if (text === null || text === undefined) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}


function formatOptionText(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (typeof value === 'object') {
    const o = value as Record<string, any>;
    if (typeof o.label === 'string') return o.label;
    if (o.label && typeof o.label === 'object') {
      return o.label.en || o.label.am || '';
    }
    if (typeof o.label_en === 'string') return o.label_en;
    if (typeof o.label_am === 'string') return o.label_am;
    if (typeof o.text === 'string') return o.text;
    if (typeof o.text_en === 'string') return o.text_en;
    if (typeof o.value === 'string') return o.value;
  }
  return String(value);
}

/**
 * Exports an Exam Set into an RFC 4180 CSV spreadsheet.
 * Prefix with UTF-8 BOM (\uFEFF) for Microsoft Excel compatibility.
 */
export function exportExamSetToCsv(set: ExportableExamSet): string {
  const headers = [
    'id',
    'form',
    'topic',
    'prompt',
    'option_a',
    'option_b',
    'option_c',
    'option_d',
    'correct',
    'explanation',
  ];

  const rows: string[] = [headers.join(',')];
  const optionLetters = ['A', 'B', 'C', 'D', 'E', 'F'];

  for (const q of set.questions) {
    let correct = '';
    if (q.form === 'MULTIPLE_CHOICE') {
      if (q.correctOption !== null && q.correctOption !== undefined) {
        correct = optionLetters[q.correctOption] ?? String(q.correctOption);
      }
    } else if (q.form === 'TRUE_FALSE') {
      if (q.trueIsCorrect !== null && q.trueIsCorrect !== undefined) {
        correct = q.trueIsCorrect ? 'TRUE' : 'FALSE';
      }
    } else {
      correct = q.acceptedAnswers ? q.acceptedAnswers.join(', ') : '';
    }

    const rowCells = [
      escapeCsvCell(q.id),
      escapeCsvCell(q.form),
      escapeCsvCell(q.topic),
      escapeCsvCell(q.prompt),
      escapeCsvCell(formatOptionText(q.options[0])),
      escapeCsvCell(formatOptionText(q.options[1])),
      escapeCsvCell(formatOptionText(q.options[2])),
      escapeCsvCell(formatOptionText(q.options[3])),
      escapeCsvCell(correct),
      escapeCsvCell(q.answerDescription ?? ''),
    ];

    rows.push(rowCells.join(','));
  }

  // Prepend UTF-8 BOM
  return `\uFEFF${rows.join('\r\n')}`;
}

/**
 * Exports an Exam Set into an elegant, printable HTML exam sheet.
 * Includes official exam header, student identification section,
 * formatted questions with bubbles/checkboxes, and an optional Teacher's Answer Key.
 */
export function exportExamSetToPrintableHtml(
  set: ExportableExamSet,
  options: HtmlExportOptions = {},
): string {
  const { includeAnswers = true, autoprint = false } = options;
  const optionLetters = ['A', 'B', 'C', 'D', 'E', 'F'];

  const courseDisplay = set.courseTitle
    ? `${set.courseTitle}${set.courseCode ? ` (${set.courseCode})` : ''}`
    : 'Comprehensive Occupational Assessment (COC)';

  const yearDisplay = set.year ? `Academic Year: ${set.year}/${set.year + 1}` : '';
  const semesterDisplay = set.semesterNumber ? `Semester: ${set.semesterNumber}` : '';
  const streamDisplay = set.stream ? `Stream: ${set.stream}` : '';

  const questionsHtml = set.questions
    .map((q, idx) => {
      const qNum = idx + 1;
      let bodyHtml = '';

      if (q.form === 'MULTIPLE_CHOICE') {
        const optionsList = q.options
          .map((opt, optIdx) => {
            const letter = optionLetters[optIdx] ?? String(optIdx + 1);
            return `
              <div class="option-item">
                <span class="option-bubble">(${letter})</span>
                <span class="option-text">${escapeHtml(formatOptionText(opt))}</span>
              </div>
            `;
          })
          .join('');

        bodyHtml = `<div class="options-grid">${optionsList}</div>`;
      } else if (q.form === 'TRUE_FALSE') {
        bodyHtml = `
          <div class="tf-options">
            <span class="tf-box">[ &nbsp; ] True</span>
            <span class="tf-box">[ &nbsp; ] False</span>
          </div>
        `;
      } else {
        bodyHtml = `
          <div class="short-answer-line">
            <span class="line-label">Answer:</span>
            <div class="writing-line"></div>
          </div>
        `;
      }

      return `
        <div class="question-card">
          <div class="question-header">
            <span class="q-number">Q${qNum}.</span>
            <span class="q-id">[${escapeHtml(q.id)}]</span>
            ${q.topic ? `<span class="q-topic">${escapeHtml(q.topic)}</span>` : ''}
          </div>
          <div class="question-prompt">${escapeHtml(q.prompt)}</div>
          ${bodyHtml}
        </div>
      `;
    })
    .join('');

  let answerKeyHtml = '';
  if (includeAnswers) {
    const keyRows = set.questions
      .map((q, idx) => {
        let answerText = '—';
        if (q.form === 'MULTIPLE_CHOICE') {
          if (q.correctOption !== null && q.correctOption !== undefined) {
            const letter = optionLetters[q.correctOption] ?? String(q.correctOption);
            answerText = `(${letter}) ${escapeHtml(formatOptionText(q.options[q.correctOption]))}`;
          }
        } else if (q.form === 'TRUE_FALSE') {
          answerText = q.trueIsCorrect ? 'True' : 'False';
        } else {
          answerText = escapeHtml(q.acceptedAnswers.join(' / '));
        }

        return `
          <tr>
            <td class="key-num">${idx + 1}</td>
            <td class="key-id"><strong>${escapeHtml(q.id)}</strong></td>
            <td class="key-answer"><strong>${answerText}</strong></td>
            <td class="key-expl">${escapeHtml(q.answerDescription || '—')}</td>
          </tr>
        `;
      })
      .join('');

    answerKeyHtml = `
      <div class="page-break"></div>
      <section class="answer-key-section">
        <div class="section-title">
          <h2>Teacher's Official Answer Key &amp; Solutions</h2>
          <span class="key-set-id">${escapeHtml(set.id)}</span>
        </div>
        <table class="key-table">
          <thead>
            <tr>
              <th style="width: 40px;">#</th>
              <th style="width: 130px;">Question ID</th>
              <th style="width: 220px;">Correct Answer</th>
              <th>Detailed Solution / Explanation</th>
            </tr>
          </thead>
          <tbody>
            ${keyRows}
          </tbody>
        </table>
      </section>
    `;
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(set.id)} - Printable Exam Sheet</title>
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #111827;
      background: #f9fafb;
      margin: 0;
      padding: 24px;
      line-height: 1.5;
    }
    .exam-container {
      max-width: 850px;
      margin: 0 auto;
      background: #ffffff;
      padding: 40px;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
      border-radius: 8px;
    }
    .exam-header {
      border-bottom: 2px solid #111827;
      padding-bottom: 16px;
      margin-bottom: 24px;
      text-align: center;
    }
    .institution-name {
      font-size: 20px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 4px;
    }
    .program-name {
      font-size: 16px;
      font-weight: 600;
      color: #374151;
      margin-bottom: 8px;
    }
    .course-title {
      font-size: 18px;
      font-weight: 700;
      color: #1e40af;
      margin-bottom: 6px;
    }
    .exam-meta-pills {
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      gap: 12px;
      font-size: 13px;
      font-weight: 500;
      color: #4b5563;
      margin-top: 8px;
    }
    .meta-item {
      background: #f3f4f6;
      padding: 4px 10px;
      border-radius: 4px;
    }
    .student-box {
      border: 1px solid #d1d5db;
      background: #fdfdfd;
      border-radius: 6px;
      padding: 16px;
      margin-bottom: 24px;
    }
    .student-grid {
      display: grid;
      grid-template-columns: 2fr 1fr;
      gap: 16px;
      margin-bottom: 12px;
    }
    .student-grid-secondary {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 16px;
    }
    .field-line {
      font-size: 13px;
      font-weight: 600;
      color: #374151;
      display: flex;
      align-items: flex-end;
      gap: 8px;
    }
    .field-line .blank {
      flex: 1;
      border-bottom: 1px dashed #6b7280;
      height: 18px;
    }
    .exam-instructions {
      background: #eff6ff;
      border-left: 4px solid #3b82f6;
      padding: 12px 16px;
      font-size: 13px;
      color: #1e3a8a;
      margin-bottom: 28px;
      border-radius: 0 4px 4px 0;
    }
    .question-card {
      margin-bottom: 22px;
      padding-bottom: 18px;
      border-bottom: 1px solid #e5e7eb;
      page-break-inside: avoid;
    }
    .question-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 6px;
    }
    .q-number {
      font-size: 15px;
      font-weight: 700;
      color: #111827;
    }
    .q-id {
      font-size: 12px;
      color: #6b7280;
      font-family: monospace;
    }
    .q-topic {
      font-size: 11px;
      background: #e0f2fe;
      color: #0369a1;
      padding: 2px 6px;
      border-radius: 4px;
      font-weight: 500;
    }
    .question-prompt {
      font-size: 14px;
      font-weight: 500;
      color: #1f2937;
      margin-bottom: 10px;
      white-space: pre-wrap;
    }
    .options-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px 16px;
      padding-left: 12px;
    }
    .option-item {
      font-size: 13.5px;
      color: #374151;
      display: flex;
      align-items: flex-start;
      gap: 6px;
    }
    .option-bubble {
      font-weight: 700;
      color: #4b5563;
    }
    .tf-options {
      display: flex;
      gap: 28px;
      padding-left: 12px;
      font-size: 14px;
      color: #374151;
    }
    .short-answer-line {
      display: flex;
      align-items: flex-end;
      gap: 8px;
      margin-top: 14px;
      font-size: 13px;
      font-weight: 600;
      color: #4b5563;
    }
    .writing-line {
      flex: 1;
      border-bottom: 1px solid #9ca3af;
      height: 20px;
    }
    .page-break {
      page-break-before: always;
      margin-top: 30px;
      border-top: 2px dashed #9ca3af;
      padding-top: 24px;
    }
    .answer-key-section {
      margin-top: 16px;
    }
    .section-title {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 2px solid #111827;
      padding-bottom: 8px;
      margin-bottom: 16px;
    }
    .section-title h2 {
      margin: 0;
      font-size: 18px;
      color: #111827;
    }
    .key-set-id {
      font-size: 13px;
      font-weight: 600;
      color: #6b7280;
    }
    .key-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
    }
    .key-table th, .key-table td {
      border: 1px solid #d1d5db;
      padding: 8px 12px;
      text-align: left;
      vertical-align: top;
    }
    .key-table th {
      background: #f3f4f6;
      font-weight: 600;
    }
    .key-num { text-align: center; font-weight: 600; }
    .key-id { font-family: monospace; }
    .key-answer { color: #047857; }
    .key-expl { color: #4b5563; font-size: 12.5px; }

    @media print {
      body { background: #ffffff; padding: 0; }
      .exam-container { box-shadow: none; padding: 0; max-width: 100%; }
      .page-break { page-break-before: always; border-top: none; padding-top: 0; }
      .no-print { display: none !important; }
    }
    .action-bar {
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: #111827;
      padding: 8px 16px;
      border-radius: 8px;
      box-shadow: 0 10px 15px -3px rgba(0,0,0,0.2);
      display: flex;
      gap: 12px;
      align-items: center;
    }
    .action-bar button {
      background: #2563eb;
      color: white;
      border: none;
      padding: 8px 16px;
      border-radius: 6px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
    }
    .action-bar button:hover { background: #1d4ed8; }
  </style>
</head>
<body>
  <div class="exam-container">
    <header class="exam-header">
      <div class="institution-name">${escapeHtml(set.universityName || 'Mastara Enterprise Academic Portal')}</div>
      ${set.programName ? `<div class="program-name">${escapeHtml(set.programName)}</div>` : ''}
      <div class="course-title">${escapeHtml(courseDisplay)}</div>
      <div class="exam-meta-pills">
        <span class="meta-item"><strong>${escapeHtml(set.kind)} EXAM</strong></span>
        ${yearDisplay ? `<span class="meta-item">${escapeHtml(yearDisplay)}</span>` : ''}
        ${semesterDisplay ? `<span class="meta-item">${escapeHtml(semesterDisplay)}</span>` : ''}
        ${streamDisplay ? `<span class="meta-item">${escapeHtml(streamDisplay)}</span>` : ''}
        <span class="meta-item"><strong>Duration:</strong> ${set.minutes} Min</span>
        <span class="meta-item"><strong>Total Questions:</strong> ${set.questions.length}</span>
      </div>
    </header>

    <section class="student-box">
      <div class="student-grid">
        <div class="field-line">Student Full Name: <div class="blank"></div></div>
        <div class="field-line">Student ID No: <div class="blank"></div></div>
      </div>
      <div class="student-grid-secondary">
        <div class="field-line">Section: <div class="blank"></div></div>
        <div class="field-line">Exam Date: <div class="blank"></div></div>
        <div class="field-line">Score: <div class="blank" style="text-align: right; padding-right: 8px; font-weight: bold;">/ ${set.questions.length}</div></div>
      </div>
    </section>

    <div class="exam-instructions">
      <strong>INSTRUCTIONS:</strong> Attempt all questions. For multiple choice items, choose the letter of your answer. For true/false and short answer questions, follow the instructions given. Write legibly.
    </div>

    <main class="questions-section">
      ${questionsHtml}
    </main>

    ${answerKeyHtml}
  </div>

  <div class="action-bar no-print">
    <button onclick="window.print()">Print Exam Paper / Save PDF</button>
  </div>

  ${autoprint ? '<script>window.addEventListener("load", () => window.print());</script>' : ''}
</body>
</html>
`;
}
