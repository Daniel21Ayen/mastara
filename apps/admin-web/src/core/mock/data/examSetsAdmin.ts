// apps/admin-web/src/core/mock/data/examSetsAdmin.ts
import type {
  ExamQuestion,
  ExamQuestionInput,
  ExamSet,
  ExamSetInput,
  ExamSetListQuery,
  ExamSetListResult,
} from '@mastara/contracts';
import { examSetListQuerySchema } from '@mastara/contracts';
import { ADMIN_ERROR_CODES, needsCourse, needsReasonToChange, SET_PAGE_SIZE, setProblems } from '@mastara/domain';
import type { CatalogStatus, ExamSetKind, QuestionForm, Stream } from '@mastara/domain';

import { ApiError } from '@/core/network';

import { courseById, programById, semesters, universityById } from './catalog';

/**
 * Mock exam sets for the Admin Questions pages. A set (Mid, Final, COC or Mock) holds its questions
 * and says who it is for: university, program, semester, stream and (except COC) course. The admin
 * types the set and question IDs. Backend phase B3 replaces this.
 */

const HOUR_MS = 3_600_000;

interface SetRecord {
  id: string;
  kind: ExamSetKind;
  universityId: string;
  programId: string;
  semesterNumber: 1 | 2;
  stream: Stream;
  courseId: string | null;
  year: number;
  isFree: boolean;
  minutes: number;
  status: CatalogStatus;
  questions: ExamQuestion[];
  updatedAtMs: number;
}

const sets: SetRecord[] = [];
let seeded = false;

// ---------- seed ----------

const FORMS: readonly QuestionForm[] = [
  'MULTIPLE_CHOICE',
  'TRUE_FALSE',
  'SHORT_ANSWER',
  'BLANK_SPACE',
];
const OPTION_TEXT = ['The first statement', 'The second statement', 'The third statement', 'None'];

function seedQuestion(id: string, k: number, topic: string, subject: string): ExamQuestion {
  const form = FORMS[k % FORMS.length] ?? 'MULTIPLE_CHOICE';
  const base = {
    id,
    form,
    topic,
    options: [] as string[],
    correctOption: null as number | null,
    trueIsCorrect: null as boolean | null,
    acceptedAnswers: [] as string[],
  };
  switch (form) {
    case 'MULTIPLE_CHOICE':
      return {
        ...base,
        prompt: `Which statement about ${subject} is correct?`,
        options: [...OPTION_TEXT],
        correctOption: k % OPTION_TEXT.length,
      };
    case 'TRUE_FALSE':
      return { ...base, prompt: `${subject} is taught in the first year.`, trueIsCorrect: true };
    case 'SHORT_ANSWER':
      return { ...base, prompt: `Name one key idea of ${subject}.`, acceptedAnswers: ['key idea'] };
    default:
      return {
        ...base,
        prompt: `The central topic of ___ is part of ${subject}.`,
        acceptedAnswers: [subject.toLowerCase()],
      };
  }
}

interface SeedSet {
  id: string;
  kind: ExamSetKind;
  programId: string;
  semesterNumber: 1 | 2;
  stream: Stream;
  courseId: string | null;
  year: number;
  isFree: boolean;
  minutes: number;
  status: CatalogStatus;
  questionIds: string[];
  ago: number;
  /** Leaves the last question unfinished, as a draft can be. */
  unfinished?: boolean;
}

const SEEDS: readonly SeedSet[] = [
  {
    id: 'EXAM-SET-1041',
    kind: 'MID',
    programId: 'aastu-se',
    semesterNumber: 1,
    stream: 'NATURAL',
    courseId: 'aastu-se-s1-mat101',
    year: 2025,
    isFree: false,
    minutes: 60,
    status: 'PUBLISHED',
    questionIds: ['Q-1041', 'Q-1042', 'Q-1043'],
    ago: 30,
  },
  {
    id: 'EXAM-SET-1042',
    kind: 'MID',
    programId: 'bdu-acc',
    semesterNumber: 2,
    stream: 'SOCIAL',
    courseId: 'bdu-acc-s2-psy102',
    year: 2025,
    isFree: true,
    minutes: 45,
    status: 'PUBLISHED',
    questionIds: ['Q-1051', 'Q-1052', 'Q-1053'],
    ago: 52,
  },
  {
    id: 'EXAM-SET-1043',
    kind: 'MID',
    programId: 'aastu-se',
    semesterNumber: 1,
    stream: 'COMMON',
    courseId: 'aastu-se-s1-eng101',
    year: 2024,
    isFree: false,
    minutes: 40,
    status: 'DRAFT',
    questionIds: ['Q-1061', 'Q-1062'],
    ago: 8,
    unfinished: true,
  },
  {
    id: 'EXAM-SET-2001',
    kind: 'FINAL',
    programId: 'aastu-se',
    semesterNumber: 1,
    stream: 'NATURAL',
    courseId: 'aastu-se-s1-phy101',
    year: 2025,
    isFree: false,
    minutes: 90,
    status: 'PUBLISHED',
    questionIds: ['Q-2011', 'Q-2012', 'Q-2013'],
    ago: 70,
  },
  {
    id: 'EXAM-SET-2002',
    kind: 'FINAL',
    programId: 'bdu-cs',
    semesterNumber: 2,
    stream: 'SOCIAL',
    courseId: 'bdu-cs-s2-geo102',
    year: 2024,
    isFree: false,
    minutes: 90,
    status: 'DRAFT',
    questionIds: ['Q-2021', 'Q-2022'],
    ago: 12,
  },
  {
    id: 'COC-2025-A',
    kind: 'COC',
    programId: 'aastu-se',
    semesterNumber: 1,
    stream: 'COMMON',
    courseId: null,
    year: 2025,
    isFree: true,
    minutes: 120,
    status: 'PUBLISHED',
    questionIds: ['Q-3011', 'Q-3012', 'Q-3013', 'Q-3014'],
    ago: 96,
  },
  {
    id: 'COC-2025-B',
    kind: 'COC',
    programId: 'aastu-se',
    semesterNumber: 2,
    stream: 'COMMON',
    courseId: null,
    year: 2025,
    isFree: false,
    minutes: 120,
    status: 'DRAFT',
    questionIds: ['Q-3021', 'Q-3022'],
    ago: 5,
    unfinished: true,
  },
  {
    id: 'MOCK-2025-A',
    kind: 'MOCK',
    programId: 'aastu-se',
    semesterNumber: 1,
    stream: 'NATURAL',
    courseId: 'aastu-se-s1-che101',
    year: 2025,
    isFree: true,
    minutes: 120,
    status: 'PUBLISHED',
    questionIds: ['Q-4011', 'Q-4012', 'Q-4013'],
    ago: 120,
  },
  {
    id: 'MOCK-2025-B',
    kind: 'MOCK',
    programId: 'ju-med',
    semesterNumber: 2,
    stream: 'NATURAL',
    courseId: 'ju-med-s2-bio102',
    year: 2024,
    isFree: false,
    minutes: 100,
    status: 'DRAFT',
    questionIds: ['Q-4021'],
    ago: 3,
  },
];

function ensureSeed(now = Date.now()): void {
  if (seeded) return;
  seeded = true;
  for (const seed of SEEDS) {
    const program = programById(seed.programId);
    const course = seed.courseId ? courseById(seed.courseId) : undefined;
    if (!program || (seed.courseId && !course)) continue;
    const subject = course?.title ?? program.name;
    const topics = ['1.1 Introduction', '1.2 Key terms', '2.1 Worked examples'];
    const questions = seed.questionIds.map((id, k) => {
      const question = seedQuestion(
        id,
        k,
        seed.kind === 'MID' || seed.kind === 'FINAL' ? (topics[k % topics.length] ?? '') : '',
        subject,
      );
      const last = k === seed.questionIds.length - 1;
      return seed.unfinished && last ? { ...question, prompt: '' } : question;
    });
    sets.push({
      id: seed.id,
      kind: seed.kind,
      universityId: program.universityId,
      programId: seed.programId,
      semesterNumber: seed.semesterNumber,
      stream: seed.stream,
      courseId: seed.courseId,
      year: seed.year,
      isFree: seed.isFree,
      minutes: seed.minutes,
      status: seed.status,
      questions,
      updatedAtMs: now - seed.ago * HOUR_MS,
    });
  }
}

// ---------- reads ----------

const iso = (ms: number): string => new Date(ms).toISOString();

function toSet(record: SetRecord): ExamSet {
  const program = programById(record.programId);
  const university = universityById(record.universityId);
  const course = record.courseId ? courseById(record.courseId) : undefined;
  return {
    id: record.id,
    kind: record.kind,
    universityId: record.universityId,
    universityName: university?.shortName ?? record.universityId,
    programId: record.programId,
    programName: program?.name ?? record.programId,
    semesterNumber: record.semesterNumber,
    stream: record.stream,
    courseId: record.courseId,
    courseCode: course?.code ?? null,
    courseTitle: course?.title ?? null,
    year: record.year,
    isFree: record.isFree,
    minutes: record.minutes,
    status: record.status,
    questions: record.questions.map((question) => ({
      ...question,
      options: [...question.options],
      acceptedAnswers: [...question.acceptedAnswers],
    })),
    updatedAt: iso(record.updatedAtMs),
  };
}

function searchText(record: SetRecord): string {
  const course = record.courseId ? courseById(record.courseId) : undefined;
  return [
    record.id,
    ...record.questions.map((question) => question.id),
    course?.code,
    course?.title,
    programById(record.programId)?.name,
    universityById(record.universityId)?.shortName,
  ]
    .join(' ')
    .toLowerCase();
}

export function listExamSets(rawQuery: ExamSetListQuery): ExamSetListResult {
  ensureSeed();
  const query = examSetListQuerySchema.parse(rawQuery);
  const needle = query.q?.trim().toLowerCase();
  const rows = sets
    .filter((record) => {
      if (record.kind !== query.kind) return false;
      if (query.status && record.status !== query.status) return false;
      return !needle || searchText(record).includes(needle);
    })
    .sort((a, b) => b.updatedAtMs - a.updatedAtMs || a.id.localeCompare(b.id));
  const pageCount = Math.max(1, Math.ceil(rows.length / SET_PAGE_SIZE));
  const page = Math.min(query.page, pageCount);
  const start = (page - 1) * SET_PAGE_SIZE;
  return {
    items: rows.slice(start, start + SET_PAGE_SIZE).map(toSet),
    total: rows.length,
    page,
    pageCount,
  };
}

export function getExamSet(id: string): ExamSet {
  ensureSeed();
  const record = sets.find((item) => item.id.toLowerCase() === id.toLowerCase());
  if (!record) throw new ApiError(ADMIN_ERROR_CODES.NOT_FOUND);
  return toSet(record);
}

/** One set by its ID, or null; the form uses it to tell a new ID from an existing set. */
export function findExamSet(id: string): ExamSet | null {
  ensureSeed();
  const record = sets.find((item) => item.id.toLowerCase() === id.trim().toLowerCase());
  return record ? toSet(record) : null;
}

/** The set a question ID belongs to, if any, so the form can say "already used". */
export function findSetOfQuestion(questionId: string): string | null {
  ensureSeed();
  const wanted = questionId.trim().toLowerCase();
  const record = sets.find((set) =>
    set.questions.some((question) => question.id.toLowerCase() === wanted),
  );
  return record?.id ?? null;
}

// ---------- writes (the server rules; the mock API adds the audit entry) ----------

const clean = (values: readonly string[]): string[] =>
  values.map((value) => value.trim()).filter((value) => value !== '');

/** Only the fields of the chosen type are kept. */
function questionFields(input: ExamQuestionInput, kind: ExamSetKind): ExamQuestion {
  const mcq = input.form === 'MULTIPLE_CHOICE';
  const options = mcq ? input.options.map((option) => option.trim()) : [];
  return {
    id: input.id.trim(),
    form: input.form,
    topic: kind === 'MID' || kind === 'FINAL' ? input.topic.trim() : '',
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
  };
}

/** The scope must be real: program of the university, semester of the program, course of both. */
function assertScope(input: ExamSetInput): void {
  const program = programById(input.programId);
  if (!universityById(input.universityId) || !program) throw new ApiError(ADMIN_ERROR_CODES.NOT_FOUND);
  if (program.universityId !== input.universityId) {
    throw new ApiError(ADMIN_ERROR_CODES.VALIDATION_FAILED);
  }
  const semester = semesters.find(
    (item) => item.programId === input.programId && item.number === input.semesterNumber,
  );
  if (!semester) throw new ApiError(ADMIN_ERROR_CODES.NOT_FOUND);
  if (!needsCourse(input.kind)) return;
  const course = input.courseId ? courseById(input.courseId) : undefined;
  if (!course) throw new ApiError(ADMIN_ERROR_CODES.NOT_FOUND);
  if (course.semesterId !== semester.id || course.stream !== input.stream) {
    throw new ApiError(ADMIN_ERROR_CODES.VALIDATION_FAILED);
  }
}

function requireReason(from: CatalogStatus, to: CatalogStatus, reason: string | undefined): void {
  if (needsReasonToChange(from, to) && !reason) throw new ApiError(ADMIN_ERROR_CODES.VALIDATION_FAILED);
}

/**
 * Creates the set when its ID is new, otherwise replaces its details and questions. A set keeps its
 * kind; a question ID can only appear once across all sets.
 */
export function saveExamSet(
  input: ExamSetInput,
  now = Date.now(),
): { set: ExamSet; created: boolean; before: CatalogStatus | null } {
  ensureSeed();
  const existing = sets.find((item) => item.id.toLowerCase() === input.id.toLowerCase());
  if (existing && existing.kind !== input.kind) throw new ApiError(ADMIN_ERROR_CODES.VALIDATION_FAILED);
  assertScope(input);

  const questions = input.questions.map((question) => questionFields(question, input.kind));
  const seen = new Set<string>();
  for (const question of questions) {
    const key = question.id.toLowerCase();
    const owner = sets.find(
      (set) =>
        set !== existing && set.questions.some((item) => item.id.toLowerCase() === key),
    );
    if (seen.has(key) || owner) throw new ApiError(ADMIN_ERROR_CODES.VALIDATION_FAILED);
    seen.add(key);
  }
  if (input.status === 'PUBLISHED' && setProblems({ kind: input.kind, questions }).length > 0) {
    throw new ApiError(ADMIN_ERROR_CODES.VALIDATION_FAILED);
  }
  if (existing) requireReason(existing.status, input.status, input.reason);

  const fields = {
    kind: input.kind,
    universityId: input.universityId,
    programId: input.programId,
    semesterNumber: input.semesterNumber,
    stream: input.stream,
    courseId: needsCourse(input.kind) ? input.courseId : null,
    year: input.year,
    isFree: input.isFree,
    minutes: input.minutes,
    status: input.status,
    questions,
    updatedAtMs: now,
  };
  if (existing) {
    const before = existing.status;
    Object.assign(existing, fields);
    return { set: toSet(existing), created: false, before };
  }
  const record: SetRecord = { id: input.id.trim(), ...fields };
  sets.push(record);
  return { set: toSet(record), created: true, before: null };
}
