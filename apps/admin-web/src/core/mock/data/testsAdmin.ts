// apps/admin-web/src/core/mock/data/testsAdmin.ts
import type {
  AdminQuestion,
  QuestionInput,
  QuestionListQuery,
  QuestionListResult,
  QuizSettingsInput,
  QuizSummary,
  TestUpdate,
  TestsOverview,
} from '@mastara/contracts';
import { questionListQuerySchema } from '@mastara/contracts';
import {
  canPublishQuiz,
  CONTENT_RECENT_LIMIT,
  ADMIN_ERROR_CODES,
  needsReasonToChange,
  QUIZ_MINUTES_DEFAULT,
  questionProblems,
  TESTS_PAGE_SIZE,
} from '@mastara/domain';
import type { CatalogStatus, QuestionForm, QuizNumber } from '@mastara/domain';

import { ApiError } from '@/core/network';

import { courses } from './catalog';
import { listCourseModules } from './contentAdmin';

/**
 * Mock quizzes and questions for the Admin Tests pages. Each course has three quizzes. Questions are
 * generated per course the first time they are needed (the same way every time), then edited in memory.
 * Backend phase B3 replaces this.
 */

const HOUR_MS = 3_600_000;
const DAY_MS = 24 * HOUR_MS;

interface QuestionRecord {
  id: string;
  courseId: string;
  quizNo: QuizNumber;
  topicId: string;
  title: string;
  form: QuestionForm;
  prompt: string;
  options: string[];
  correctOption: number | null;
  trueIsCorrect: boolean | null;
  acceptedAnswers: string[];
  status: CatalogStatus;
  updatedAtMs: number;
}
interface QuizRecord {
  courseId: string;
  quizNo: QuizNumber;
  minutes: number;
  status: CatalogStatus;
}

const questions: QuestionRecord[] = [];
const quizzes: QuizRecord[] = [];
const seeded = new Set<string>();
let created = 0;

const QUIZ_NUMBERS_LIST: readonly QuizNumber[] = [1, 2, 3];
const QUIZ_MINUTES: Record<QuizNumber, number> = { 1: 15, 2: 20, 3: QUIZ_MINUTES_DEFAULT };
const QUESTIONS_PER_QUIZ: Record<QuizNumber, number> = { 1: 5, 2: 8, 3: 6 };
const FORMS: readonly QuestionForm[] = [
  'MULTIPLE_CHOICE',
  'TRUE_FALSE',
  'SHORT_ANSWER',
  'BLANK_SPACE',
  'MULTIPLE_CHOICE',
];
const OPTION_TEXT = [
  'The first statement',
  'The second statement',
  'The third statement',
  'None of the above',
];

const questionCountPerCourse = QUIZ_NUMBERS_LIST.reduce(
  (sum, quizNo) => sum + QUESTIONS_PER_QUIZ[quizNo],
  0,
);

/** Who is published: Quiz 1 fully, Quiz 2 mostly, Quiz 3 only its first questions. */
function seedStatus(quizNo: QuizNumber, k: number): CatalogStatus {
  const published = quizNo === 1 ? true : quizNo === 2 ? k < 6 : k < 3;
  return published ? 'PUBLISHED' : 'DRAFT';
}

function seedQuestion(
  courseId: string,
  courseTitle: string,
  quizNo: QuizNumber,
  k: number,
  topic: { id: string; title: string },
  id: string,
  now: number,
): QuestionRecord {
  const form = FORMS[(k + quizNo - 1) % FORMS.length] ?? 'MULTIPLE_CHOICE';
  const base = {
    id,
    courseId,
    quizNo,
    topicId: topic.id,
    title: `${topic.title} · question ${k + 1}`,
    form,
    options: [] as string[],
    correctOption: null as number | null,
    trueIsCorrect: null as boolean | null,
    acceptedAnswers: [] as string[],
    status: seedStatus(quizNo, k),
    updatedAtMs: now - (quizNo * 5 + k * 3 + 1) * HOUR_MS,
  };
  switch (form) {
    case 'MULTIPLE_CHOICE':
      return {
        ...base,
        prompt: `Which statement about "${topic.title}" is correct?`,
        options: [...OPTION_TEXT],
        correctOption: k % OPTION_TEXT.length,
      };
    case 'TRUE_FALSE':
      return {
        ...base,
        prompt: `"${topic.title}" is covered in ${courseTitle}.`,
        trueIsCorrect: k % 2 === 0,
      };
    case 'SHORT_ANSWER':
      return {
        ...base,
        prompt: `Name one key term from "${topic.title}".`,
        acceptedAnswers: ['key term'],
      };
    default:
      return {
        ...base,
        prompt: `The main idea of ___ is introduced in ${courseTitle}.`,
        acceptedAnswers: [topic.title.toLowerCase()],
      };
  }
}

/** Builds the course's three quizzes and their questions once. Throws NOT_FOUND for an unknown course. */
function ensureCourse(courseId: string, now = Date.now()): void {
  if (seeded.has(courseId)) return;
  const ordinal = courses.findIndex((course) => course.id === courseId);
  const course = courses[ordinal];
  if (!course) throw new ApiError(ADMIN_ERROR_CODES.NOT_FOUND);
  seeded.add(courseId);

  const topics = listCourseModules(courseId).flatMap((module) =>
    module.topics.map((topic) => ({ id: topic.id, title: topic.title.en })),
  );
  let seq = 0;
  for (const quizNo of QUIZ_NUMBERS_LIST) {
    quizzes.push({
      courseId,
      quizNo,
      minutes: QUIZ_MINUTES[quizNo],
      status: quizNo === 3 ? 'DRAFT' : 'PUBLISHED',
    });
    for (let k = 0; k < QUESTIONS_PER_QUIZ[quizNo]; k += 1) {
      const topic = topics[(seq + quizNo) % topics.length];
      if (topic) {
        questions.push(
          seedQuestion(
            courseId,
            course.title,
            quizNo,
            k,
            topic,
            `Q-${1001 + ordinal * questionCountPerCourse + seq}`,
            now,
          ),
        );
      }
      seq += 1;
    }
  }
}

function ensureAll(): void {
  for (const course of courses) ensureCourse(course.id);
}

// ---------- reads ----------

const iso = (ms: number): string => new Date(ms).toISOString();

/** "2.3 Worked examples" for every topic of a course, by topic ID. */
function topicLabels(courseId: string): Map<string, string> {
  const labels = new Map<string, string>();
  for (const module of listCourseModules(courseId)) {
    for (const topic of module.topics) labels.set(topic.id, `${topic.code} ${topic.title.en}`);
  }
  return labels;
}

function toQuestion(
  record: QuestionRecord,
  labels: Map<string, string>,
  siblings: readonly QuestionRecord[],
): AdminQuestion {
  const course = courses.find((item) => item.id === record.courseId);
  const same = siblings.filter(
    (item) => item.courseId === record.courseId && item.quizNo === record.quizNo,
  );
  const next = same[same.findIndex((item) => item.id === record.id) + 1];
  return {
    id: record.id,
    courseId: record.courseId,
    courseCode: course?.code ?? record.courseId,
    courseTitle: course?.title ?? record.courseId,
    quizNo: record.quizNo,
    topicId: record.topicId,
    topicLabel: labels.get(record.topicId) ?? '',
    title: record.title,
    form: record.form,
    prompt: record.prompt,
    options: [...record.options],
    correctOption: record.correctOption,
    trueIsCorrect: record.trueIsCorrect,
    acceptedAnswers: [...record.acceptedAnswers],
    status: record.status,
    updatedAt: iso(record.updatedAtMs),
    nextId: next?.id ?? null,
  };
}

const byId = (a: QuestionRecord, b: QuestionRecord): number => a.id.localeCompare(b.id);

export function listQuestions(rawQuery: QuestionListQuery): QuestionListResult {
  ensureAll();
  const query = questionListQuerySchema.parse(rawQuery);
  const needle = query.q?.trim().toLowerCase();
  const labelCache = new Map<string, Map<string, string>>();
  const labelsOf = (courseId: string) => {
    let labels = labelCache.get(courseId);
    if (!labels) {
      labels = topicLabels(courseId);
      labelCache.set(courseId, labels);
    }
    return labels;
  };

  const ordered = [...questions].sort(byId);
  const rows = ordered.filter((record) => {
    if (record.quizNo !== query.quizNo) return false;
    if (query.courseId && record.courseId !== query.courseId) return false;
    if (query.form && record.form !== query.form) return false;
    if (query.status && record.status !== query.status) return false;
    if (needle) {
      const text = `${record.id} ${record.title} ${record.prompt} ${labelsOf(record.courseId).get(record.topicId) ?? ''}`;
      if (!text.toLowerCase().includes(needle)) return false;
    }
    return true;
  });

  const pageCount = Math.max(1, Math.ceil(rows.length / TESTS_PAGE_SIZE));
  const page = Math.min(query.page, pageCount);
  const start = (page - 1) * TESTS_PAGE_SIZE;
  return {
    items: rows
      .slice(start, start + TESTS_PAGE_SIZE)
      .map((record) => toQuestion(record, labelsOf(record.courseId), ordered)),
    total: rows.length,
    page,
    pageCount,
  };
}

export function getQuestion(id: string): AdminQuestion {
  ensureAll();
  const record = questions.find((item) => item.id === id);
  if (!record) throw new ApiError(ADMIN_ERROR_CODES.NOT_FOUND);
  return toQuestion(record, topicLabels(record.courseId), [...questions].sort(byId));
}

function quizSummary(courseId: string, quizNo: QuizNumber): QuizSummary {
  const quiz = quizzes.find((item) => item.courseId === courseId && item.quizNo === quizNo);
  if (!quiz) throw new ApiError(ADMIN_ERROR_CODES.NOT_FOUND);
  const inQuiz = questions.filter((item) => item.courseId === courseId && item.quizNo === quizNo);
  return {
    quizNo,
    questionCount: inQuiz.length,
    publishedQuestionCount: inQuiz.filter((item) => item.status === 'PUBLISHED').length,
    minutes: quiz.minutes,
    status: quiz.status,
  };
}

export function testsOverview(courseId: string): TestsOverview {
  ensureCourse(courseId);
  const recent: TestUpdate[] = questions
    .filter((item) => item.courseId === courseId)
    .sort((a, b) => b.updatedAtMs - a.updatedAtMs)
    .slice(0, CONTENT_RECENT_LIMIT)
    .map((item) => ({
      id: item.id,
      quizNo: item.quizNo,
      title: item.title,
      status: item.status,
      at: iso(item.updatedAtMs),
    }));
  return { courseId, quizzes: QUIZ_NUMBERS_LIST.map((n) => quizSummary(courseId, n)), recent };
}

// ---------- writes (the server rules; the mock API adds the audit entry) ----------

function requireReason(from: CatalogStatus, to: CatalogStatus, reason: string | undefined): void {
  if (needsReasonToChange(from, to) && !reason) throw new ApiError(ADMIN_ERROR_CODES.VALIDATION_FAILED);
}

/** The topic must belong to the question's course, and publishing needs a finished question. */
function assertQuestion(input: QuestionInput): void {
  ensureCourse(input.courseId);
  const topicOk = listCourseModules(input.courseId).some((module) =>
    module.topics.some((topic) => topic.id === input.topicId),
  );
  if (!topicOk) throw new ApiError(ADMIN_ERROR_CODES.NOT_FOUND);
  if (input.status === 'PUBLISHED' && questionProblems(input).length > 0) {
    throw new ApiError(ADMIN_ERROR_CODES.VALIDATION_FAILED);
  }
}

const clean = (values: readonly string[]): string[] =>
  values.map((value) => value.trim()).filter((value) => value !== '');

/** Only the fields of the chosen type are kept. */
function fieldsOf(input: QuestionInput) {
  const mcq = input.form === 'MULTIPLE_CHOICE';
  const options = mcq ? input.options.map((option) => option.trim()) : [];
  return {
    courseId: input.courseId,
    quizNo: input.quizNo,
    topicId: input.topicId,
    title: input.title.trim(),
    form: input.form,
    prompt: input.prompt.trim(),
    options,
    correctOption:
      mcq && input.correctOption !== null && input.correctOption < options.length
        ? input.correctOption
        : null,
    trueIsCorrect: input.form === 'TRUE_FALSE' ? input.trueIsCorrect : null,
    acceptedAnswers:
      input.form === 'SHORT_ANSWER' || input.form === 'BLANK_SPACE'
        ? clean(input.acceptedAnswers)
        : [],
    status: input.status,
  };
}

export function createQuestion(input: QuestionInput, now = Date.now()): AdminQuestion {
  assertQuestion(input);
  created += 1;
  const record: QuestionRecord = {
    id: `Q-${9000 + created}`,
    ...fieldsOf(input),
    updatedAtMs: now,
  };
  questions.push(record);
  return getQuestion(record.id);
}

export function updateQuestion(
  id: string,
  input: QuestionInput,
  now = Date.now(),
): { question: AdminQuestion; before: CatalogStatus } {
  ensureAll();
  const record = questions.find((item) => item.id === id);
  if (!record) throw new ApiError(ADMIN_ERROR_CODES.NOT_FOUND);
  // A question stays in its course; only its quiz and topic can change.
  assertQuestion({ ...input, courseId: record.courseId });
  requireReason(record.status, input.status, input.reason);
  const before = record.status;
  Object.assign(record, fieldsOf({ ...input, courseId: record.courseId }), { updatedAtMs: now });
  return { question: getQuestion(id), before };
}

/** Time allowed and visibility of a quiz. Publishing needs at least one published question. */
export function updateQuiz(
  courseId: string,
  quizNo: QuizNumber,
  input: QuizSettingsInput,
): { quiz: QuizSummary; before: CatalogStatus } {
  ensureCourse(courseId);
  const record = quizzes.find((item) => item.courseId === courseId && item.quizNo === quizNo);
  if (!record) throw new ApiError(ADMIN_ERROR_CODES.NOT_FOUND);
  requireReason(record.status, input.status, input.reason);
  if (
    input.status === 'PUBLISHED' &&
    !canPublishQuiz(quizSummary(courseId, quizNo).publishedQuestionCount)
  ) {
    throw new ApiError(ADMIN_ERROR_CODES.VALIDATION_FAILED);
  }
  const before = record.status;
  record.minutes = input.minutes;
  record.status = input.status;
  return { quiz: quizSummary(courseId, quizNo), before };
}
