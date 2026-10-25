// apps/admin-web/src/core/mock/data/contentAdmin.ts
import type {
  AdminModule,
  AdminNote,
  AdminTopic,
  AmharicNoteInput,
  ContentCourse,
  ContentSummary,
  ContentUpdate,
  ModuleInput,
  NoteInput,
  TopicInput,
} from '@mastara/contracts';
import {
  CONTENT_RECENT_LIMIT,
  ADMIN_ERROR_CODES,
  hasAmharic,
  missingForPublish,
  needsReasonToChange,
  nextVersion,
  QUIZ_COUNT,
} from '@mastara/domain';
import type { CatalogStatus } from '@mastara/domain';

import { ApiError } from '@/core/network';

import { courseById, courses, programById, semesterById, universityById } from './catalog';

/**
 * Mock content for the Admin Material pages. Modules, topics and notes are generated per course the
 * first time a course is opened (the same way every time), then edited in memory. One note record holds
 * English and Amharic, so Notes and Amharic Notes are two views of it. Backend phase B3 replaces this.
 */

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;

interface ModuleRecord {
  id: string;
  courseId: string;
  number: number;
  title: { en: string; am: string };
  status: CatalogStatus;
  updatedAtMs: number;
}
interface TopicRecord {
  id: string;
  moduleId: string;
  number: number;
  title: { en: string; am: string };
}
interface NoteRecord {
  id: string;
  courseId: string;
  moduleId: string;
  title: { en: string; am: string };
  body: { en: string; am: string };
  isFree: boolean;
  status: CatalogStatus;
  version: number;
  updatedAtMs: number;
  /** Which language was edited last, for "Recent updates". */
  lastLang: 'en' | 'am';
}

const modules: ModuleRecord[] = [];
const topics: TopicRecord[] = [];
const notes: NoteRecord[] = [];
const seeded = new Set<string>();

// ---------- seed ----------

const MODULE_TITLES: readonly { en: string; am: string }[] = [
  { en: 'Introduction', am: 'መግቢያ' },
  { en: 'Core concepts', am: 'ዋና ጽንሰ-ሀሳቦች' },
  { en: 'Applications', am: 'አተገባበር' },
  { en: 'Practice and review', am: 'ልምምድ እና ክለሳ' },
  { en: 'Exam preparation', am: 'የፈተና ዝግጅት' },
];
const TOPIC_TITLES: readonly { en: string; am: string }[] = [
  { en: 'Overview', am: 'አጠቃላይ እይታ' },
  { en: 'Key terms', am: 'ቁልፍ ቃላት' },
  { en: 'Main ideas', am: 'ዋና ሀሳቦች' },
  { en: 'Worked examples', am: 'የተሰሩ ምሳሌዎች' },
  { en: 'Review questions', am: 'የክለሳ ጥያቄዎች' },
];
const NOTE_TITLES: readonly { en: string; am: string }[] = [
  { en: 'Key concepts', am: 'ዋና ጽንሰ-ሀሳቦች' },
  { en: 'Definitions', am: 'ትርጓሜዎች' },
  { en: 'Examples', am: 'ምሳሌዎች' },
  { en: 'Summary', am: 'ማጠቃለያ' },
  { en: 'Common mistakes', am: 'የተለመዱ ስህተቶች' },
];
const TOPICS_PER_MODULE = [5, 5, 5, 5, 4];
const NOTES_PER_MODULE = [3, 4, 3, 2, 2];
const FORMULAS =
  "The rate of change is $f'(x)=\\lim_{h\\to 0}\\frac{f(x+h)-f(x)}{h}$ at every point.\n\n$$x=\\frac{-b\\pm\\sqrt{b^2-4ac}}{2a}$$\n\nEnergy and mass are linked by $E = mc^2$.";

function noteBody(courseTitle: string, title: { en: string; am: string }, natural: boolean) {
  const math = natural ? `\n\n${FORMULAS}` : '';
  return {
    en: `Sample content for "${title.en}" in ${courseTitle}.\n\nThis text is mock data. Real content is written in the admin portal.${math}`,
    am: `ይህ የናሙና ይዘት ነው።\n\n"${title.am}" · ${courseTitle}${math}`,
  };
}

/** Builds the course's modules, topics and notes once. Throws NOT_FOUND for an unknown course. */
function ensureCourse(courseId: string, now = Date.now()): void {
  if (seeded.has(courseId)) return;
  const course = courseById(courseId);
  if (!course) throw new ApiError(ADMIN_ERROR_CODES.NOT_FOUND);
  seeded.add(courseId);

  const natural = course.stream === 'NATURAL';
  let age = 0;
  MODULE_TITLES.forEach((moduleTitle, moduleIndex) => {
    const moduleId = `${courseId}~m${moduleIndex + 1}`;
    age += 1;
    modules.push({
      id: moduleId,
      courseId,
      number: moduleIndex + 1,
      title: moduleTitle,
      // The first three modules are live, the rest still drafts.
      status: moduleIndex < 3 ? 'PUBLISHED' : 'DRAFT',
      updatedAtMs: now - (moduleIndex === 0 ? 2 : 6 + moduleIndex * 5) * HOUR_MS,
    });
    for (let t = 0; t < (TOPICS_PER_MODULE[moduleIndex] ?? 4); t += 1) {
      topics.push({
        id: `${moduleId}~t${t + 1}`,
        moduleId,
        number: t + 1,
        title: TOPIC_TITLES[t] ?? { en: `Topic ${t + 1}`, am: `ርዕስ ${t + 1}` },
      });
    }
    for (let n = 0; n < (NOTES_PER_MODULE[moduleIndex] ?? 2); n += 1) {
      const noteTitle = NOTE_TITLES[(n + moduleIndex) % NOTE_TITLES.length] ?? NOTE_TITLES[0]!;
      const withAmharic = (n + moduleIndex) % 2 === 0;
      const full = noteBody(course.title, noteTitle, natural);
      const published = moduleIndex < 3;
      notes.push({
        id: `${moduleId}~n${n + 1}`,
        courseId,
        moduleId,
        title: { en: noteTitle.en, am: withAmharic ? noteTitle.am : '' },
        body: { en: full.en, am: withAmharic ? full.am : '' },
        isFree: moduleIndex === 0 && n === 0,
        status: published ? 'PUBLISHED' : 'DRAFT',
        version: published ? 1 + ((n + moduleIndex) % 3) : 0,
        updatedAtMs: now - (age * 3 + n * 7 + 1) * HOUR_MS,
        lastLang: withAmharic && n % 2 === 0 ? 'am' : 'en',
      });
    }
  });
}

// ---------- reads ----------

const iso = (ms: number): string => new Date(ms).toISOString();

/** Courses an admin can open in Content, in catalog order. */
export function listContentCourses(): ContentCourse[] {
  return courses
    .map((course) => {
      const semester = semesterById(course.semesterId);
      const program = semester && programById(semester.programId);
      const university = program && universityById(program.universityId);
      return {
        id: course.id,
        code: course.code,
        title: course.title,
        programName: program?.name ?? '',
        universityShortName: university?.shortName ?? '',
        order: `${university?.shortName ?? ''}|${program?.name ?? ''}|${semester?.number ?? 0}|${course.code}`,
      };
    })
    .sort((a, b) => a.order.localeCompare(b.order))
    .map(({ order: _order, ...option }) => option);
}

function toTopic(topic: TopicRecord, moduleNumber: number): AdminTopic {
  return {
    id: topic.id,
    moduleId: topic.moduleId,
    number: topic.number,
    code: `${moduleNumber}.${topic.number}`,
    title: topic.title,
  };
}

function toModule(record: ModuleRecord): AdminModule {
  return {
    id: record.id,
    courseId: record.courseId,
    number: record.number,
    title: record.title,
    status: record.status,
    topics: topics
      .filter((topic) => topic.moduleId === record.id)
      .sort((a, b) => a.number - b.number)
      .map((topic) => toTopic(topic, record.number)),
    notes: notes
      .filter((note) => note.moduleId === record.id)
      .map((note) => ({ id: note.id, title: note.title.en })),
    updatedAt: iso(record.updatedAtMs),
  };
}

function moduleNumberOf(moduleId: string): number {
  return modules.find((record) => record.id === moduleId)?.number ?? 0;
}

function toNote(record: NoteRecord): AdminNote {
  return {
    id: record.id,
    courseId: record.courseId,
    moduleId: record.moduleId,
    moduleNumber: moduleNumberOf(record.moduleId),
    title: record.title,
    body: record.body,
    isFree: record.isFree,
    status: record.status,
    version: record.version,
    updatedAt: iso(record.updatedAtMs),
  };
}

export function listCourseModules(courseId: string): AdminModule[] {
  ensureCourse(courseId);
  return modules
    .filter((record) => record.courseId === courseId)
    .sort((a, b) => a.number - b.number)
    .map(toModule);
}

/** Newest first. */
export function listCourseNotes(courseId: string): AdminNote[] {
  ensureCourse(courseId);
  return notes
    .filter((record) => record.courseId === courseId)
    .sort((a, b) => b.updatedAtMs - a.updatedAtMs)
    .map(toNote);
}

export function getCourseNote(id: string): AdminNote {
  const record = notes.find((item) => item.id === id);
  if (!record) throw new ApiError(ADMIN_ERROR_CODES.NOT_FOUND);
  return toNote(record);
}

export function contentSummary(courseId: string): ContentSummary {
  ensureCourse(courseId);
  const inCourse = modules.filter((record) => record.courseId === courseId);
  const courseNotes = notes.filter((record) => record.courseId === courseId);
  const moduleIds = new Set(inCourse.map((record) => record.id));

  const updates: (ContentUpdate & { ms: number })[] = [
    ...inCourse.map((record) => ({
      id: record.id,
      kind: 'MODULE' as const,
      title: `Module ${record.number} - ${record.title.en}`,
      moduleNumber: record.number,
      at: iso(record.updatedAtMs),
      ms: record.updatedAtMs,
    })),
    ...courseNotes.map((record) => {
      const amharic = record.lastLang === 'am' && record.title.am !== '';
      return {
        id: record.id,
        kind: amharic ? ('AMHARIC_NOTE' as const) : ('NOTE' as const),
        title: amharic ? record.title.am : record.title.en,
        moduleNumber: moduleNumberOf(record.moduleId),
        at: iso(record.updatedAtMs),
        ms: record.updatedAtMs,
      };
    }),
  ];

  return {
    courseId,
    moduleCount: inCourse.length,
    publishedModuleCount: inCourse.filter((record) => record.status === 'PUBLISHED').length,
    topicCount: topics.filter((topic) => moduleIds.has(topic.moduleId)).length,
    noteCount: courseNotes.length,
    amharicNoteCount: courseNotes.filter((record) => hasAmharic(record)).length,
    quizCount: QUIZ_COUNT,
    recent: updates
      .sort((a, b) => b.ms - a.ms)
      .slice(0, CONTENT_RECENT_LIMIT)
      .map(({ ms: _ms, ...update }) => update),
  };
}

// ---------- writes (the server rules; the mock API adds the audit entry) ----------

function requireReason(from: CatalogStatus, to: CatalogStatus, reason: string | undefined): void {
  if (needsReasonToChange(from, to) && !reason) throw new ApiError(ADMIN_ERROR_CODES.VALIDATION_FAILED);
}

export function createCourseModule(input: ModuleInput, now = Date.now()): AdminModule {
  ensureCourse(input.courseId);
  const number =
    Math.max(0, ...modules.filter((m) => m.courseId === input.courseId).map((m) => m.number)) + 1;
  const record: ModuleRecord = {
    id: `${input.courseId}~m${number}`,
    courseId: input.courseId,
    number,
    title: { en: input.title.en.trim(), am: input.title.am.trim() },
    status: input.status,
    updatedAtMs: now,
  };
  modules.push(record);
  return toModule(record);
}

export function updateCourseModule(
  id: string,
  input: ModuleInput,
  now = Date.now(),
): { module: AdminModule; before: CatalogStatus } {
  const record = modules.find((item) => item.id === id);
  if (!record) throw new ApiError(ADMIN_ERROR_CODES.NOT_FOUND);
  requireReason(record.status, input.status, input.reason);
  const before = record.status;
  record.title = { en: input.title.en.trim(), am: input.title.am.trim() };
  record.status = input.status;
  record.updatedAtMs = now;
  return { module: toModule(record), before };
}

export function createModuleTopic(input: TopicInput, now = Date.now()): AdminTopic {
  const parent = modules.find((item) => item.id === input.moduleId);
  if (!parent) throw new ApiError(ADMIN_ERROR_CODES.NOT_FOUND);
  const number =
    Math.max(0, ...topics.filter((t) => t.moduleId === parent.id).map((t) => t.number)) + 1;
  const record: TopicRecord = {
    id: `${parent.id}~t${number}`,
    moduleId: parent.id,
    number,
    title: { en: input.title.en.trim(), am: input.title.am.trim() },
  };
  topics.push(record);
  parent.updatedAtMs = now;
  return toTopic(record, parent.number);
}

function assertNoteScope(input: NoteInput): void {
  ensureCourse(input.courseId);
  const parent = modules.find((item) => item.id === input.moduleId);
  if (!parent || parent.courseId !== input.courseId) throw new ApiError(ADMIN_ERROR_CODES.NOT_FOUND);
}

/** Publishing needs both languages complete. */
function assertPublishable(input: Pick<NoteInput, 'title' | 'body' | 'status'>): void {
  if (input.status === 'PUBLISHED' && missingForPublish(input).length > 0) {
    throw new ApiError(ADMIN_ERROR_CODES.VALIDATION_FAILED);
  }
}

const trimmed = (value: { en: string; am: string }) => ({
  en: value.en.trim(),
  am: value.am.trim(),
});

export function createCourseNote(input: NoteInput, now = Date.now()): AdminNote {
  assertNoteScope(input);
  assertPublishable(input);
  const number = notes.filter((item) => item.moduleId === input.moduleId).length + 1;
  const record: NoteRecord = {
    id: `${input.moduleId}~n${number}-${notes.length + 1}`,
    courseId: input.courseId,
    moduleId: input.moduleId,
    title: trimmed(input.title),
    body: trimmed(input.body),
    isFree: input.isFree,
    status: input.status,
    version: nextVersion(0, input.status),
    updatedAtMs: now,
    lastLang: 'en',
  };
  notes.push(record);
  return toNote(record);
}

export function updateCourseNote(
  id: string,
  input: NoteInput,
  now = Date.now(),
): { note: AdminNote; before: CatalogStatus } {
  const record = notes.find((item) => item.id === id);
  if (!record) throw new ApiError(ADMIN_ERROR_CODES.NOT_FOUND);
  assertNoteScope({ ...input, courseId: record.courseId });
  assertPublishable(input);
  requireReason(record.status, input.status, input.reason);

  const before = record.status;
  const amharicOnly =
    input.title.en.trim() === record.title.en && input.body.en.trim() === record.body.en;
  record.moduleId = input.moduleId;
  record.title = trimmed(input.title);
  record.body = trimmed(input.body);
  record.isFree = input.isFree;
  record.status = input.status;
  record.version = nextVersion(record.version, input.status);
  record.updatedAtMs = now;
  record.lastLang = amharicOnly ? 'am' : 'en';
  return { note: toNote(record), before };
}

/** Saves the Amharic view of a note. A published note gets a new version because students see the change. */
export function saveAmharicNote(id: string, input: AmharicNoteInput, now = Date.now()): AdminNote {
  const record = notes.find((item) => item.id === id);
  if (!record) throw new ApiError(ADMIN_ERROR_CODES.NOT_FOUND);
  record.title = { ...record.title, am: input.title.trim() };
  record.body = { ...record.body, am: input.body.trim() };
  record.version = nextVersion(record.version, record.status);
  record.updatedAtMs = now;
  record.lastLang = 'am';
  return toNote(record);
}
