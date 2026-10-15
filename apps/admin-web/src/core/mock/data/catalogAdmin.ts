// apps/admin-web/src/core/mock/data/catalogAdmin.ts
import type {
  AdminCourse,
  AdminProgram,
  AdminSemester,
  AdminUniversity,
  CourseListQuery,
  CourseListResult,
  CreateCourseInput,
  ProgramInput,
  SemesterStatusInput,
  UniversityInput,
  UpdateCourseInput,
} from '@mastara/contracts';
import { courseListQuerySchema } from '@mastara/contracts';
import {
  ALL_UNIVERSITIES,
  CATALOG_PAGE_SIZE,
  ADMIN_ERROR_CODES,
  needsReasonToChange,
  normalizeCourseCode,
  slugify,
} from '@mastara/domain';
import type { CatalogStatus, Stream } from '@mastara/domain';

import { ApiError } from '@/core/network';

import {
  courseById,
  courses,
  programById,
  programs,
  semesterById,
  semesters,
  universities,
  universityById,
} from './catalog';

/**
 * Admin view of the mock catalog. Publish state and the "promotional" flag live beside the shared
 * lists in `catalog.ts`, so students and the student app mock keep reading the same tree. These are the
 * server rules; the mock API adds the audit entry. Backend phase B3 replaces all of this.
 */

const universityStatus = new Map<string, CatalogStatus>();
const programStatus = new Map<string, CatalogStatus>();
const semesterStatus = new Map<string, CatalogStatus>();
const courseMeta = new Map<string, { status: CatalogStatus; freeTrialItems: number }>();

/** A course open to every university: it has no program, only Semester 1 or 2. */
interface SharedCourse {
  id: string;
  semesterNumber: 1 | 2;
  code: string;
  title: string;
  stream: Stream;
}
const sharedCourses: SharedCourse[] = [
  { id: 'all-s1-ent101', semesterNumber: 1, code: 'ENT101', title: 'Entrepreneurship', stream: 'COMMON' },
];
const SHARED_LABEL = 'All';

/** Who uses an entry. Set by the students mock, so an entry that students depend on cannot be deleted. */
type UsageKind = 'university' | 'program' | 'semester' | 'course';
let countStudents: (kind: UsageKind, id: string) => number = () => 0;
export function registerCatalogUsage(count: (kind: UsageKind, id: string) => number): void {
  countStudents = count;
}

/** Seed: everything is published; two courses wait as drafts and two are open to unpaid students. */
const DRAFT_COURSES: readonly string[] = ['aastu-ce-s2-fit102', 'mu-bio-s2-ant102'];
const PROMOTIONAL_CODES: readonly string[] = ['ENG101', 'LOG101'];
/** Free-trial items the seed gives a promotional course. Admins set the number when they save a course. */
const SEED_FREE_TRIAL_ITEMS = 4;

for (const university of universities) universityStatus.set(university.id, 'PUBLISHED');
for (const program of programs) programStatus.set(program.id, 'PUBLISHED');
for (const semester of semesters) semesterStatus.set(semester.id, 'PUBLISHED');
for (const course of courses) {
  courseMeta.set(course.id, {
    status: DRAFT_COURSES.includes(course.id) ? 'DRAFT' : 'PUBLISHED',
    freeTrialItems: PROMOTIONAL_CODES.includes(course.code) ? SEED_FREE_TRIAL_ITEMS : 0,
  });
}
for (const course of sharedCourses) courseMeta.set(course.id, { status: 'PUBLISHED', freeTrialItems: 2 });

const statusOf = (map: Map<string, CatalogStatus>, id: string): CatalogStatus =>
  map.get(id) ?? 'DRAFT';

export const isUniversityPublished = (id: string): boolean =>
  statusOf(universityStatus, id) === 'PUBLISHED';
export const isProgramPublished = (id: string): boolean =>
  statusOf(programStatus, id) === 'PUBLISHED';

// ---------- reads ----------

function toCourse(id: string): AdminCourse {
  const shared = sharedCourses.find((candidate) => candidate.id === id);
  const sharedMeta = courseMeta.get(id);
  if (shared && sharedMeta) {
    return {
      id: shared.id,
      semesterId: `${ALL_UNIVERSITIES.toLowerCase()}-s${shared.semesterNumber}`,
      programId: null,
      programName: null,
      universityId: ALL_UNIVERSITIES,
      universityShortName: SHARED_LABEL,
      semesterNumber: shared.semesterNumber,
      code: shared.code,
      title: shared.title,
      stream: shared.stream,
      promotional: sharedMeta.freeTrialItems > 0,
      freeTrialItems: sharedMeta.freeTrialItems,
      status: sharedMeta.status,
    };
  }
  const course = courseById(id);
  const semester = course && semesterById(course.semesterId);
  const program = semester && programById(semester.programId);
  const university = program && universityById(program.universityId);
  const meta = courseMeta.get(id);
  if (!course || !semester || !program || !university || !meta) {
    throw new ApiError(ADMIN_ERROR_CODES.NOT_FOUND);
  }
  return {
    id: course.id,
    semesterId: semester.id,
    programId: program.id,
    programName: program.name,
    universityId: university.id,
    universityShortName: university.shortName,
    semesterNumber: semester.number,
    code: course.code,
    title: course.title,
    stream: course.stream,
    promotional: meta.freeTrialItems > 0,
    freeTrialItems: meta.freeTrialItems,
    status: meta.status,
  };
}

export function listCatalogCourses(rawQuery: CourseListQuery): CourseListResult {
  const query = courseListQuerySchema.parse(rawQuery);
  const needle = query.q?.trim().toLowerCase();

  const rows = [...courses.map((course) => course.id), ...sharedCourses.map((course) => course.id)]
    .map((id) => toCourse(id))
    .filter((row) => {
      if (needle && !`${row.code} ${row.title}`.toLowerCase().includes(needle)) return false;
      // A university filter also shows the courses open to every university.
      if (query.universityId === ALL_UNIVERSITIES && row.universityId !== ALL_UNIVERSITIES) return false;
      if (
        query.universityId &&
        query.universityId !== ALL_UNIVERSITIES &&
        row.universityId !== query.universityId &&
        row.universityId !== ALL_UNIVERSITIES
      ) {
        return false;
      }
      if (query.programId && row.programId !== query.programId) return false;
      if (query.semesterNumber && row.semesterNumber !== query.semesterNumber) return false;
      if (query.stream && row.stream !== query.stream) return false;
      if (query.status && row.status !== query.status) return false;
      return true;
    })
    .sort(
      (a, b) =>
        Number(a.universityId === ALL_UNIVERSITIES) - Number(b.universityId === ALL_UNIVERSITIES) ||
        a.universityShortName.localeCompare(b.universityShortName) ||
        (a.programName ?? '').localeCompare(b.programName ?? '') ||
        a.semesterNumber - b.semesterNumber ||
        a.code.localeCompare(b.code),
    );

  const pageCount = Math.max(1, Math.ceil(rows.length / CATALOG_PAGE_SIZE));
  const page = Math.min(query.page, pageCount);
  const start = (page - 1) * CATALOG_PAGE_SIZE;
  return {
    items: rows.slice(start, start + CATALOG_PAGE_SIZE),
    total: rows.length,
    page,
    pageCount,
  };
}

export function listCatalogUniversities(): AdminUniversity[] {
  return universities.map((university) => ({
    ...university,
    status: statusOf(universityStatus, university.id),
    programCount: programs.filter((program) => program.universityId === university.id).length,
  }));
}

export function listCatalogPrograms(): AdminProgram[] {
  return programs.map((program) => ({
    id: program.id,
    universityId: program.universityId,
    universityShortName: universityById(program.universityId)?.shortName ?? program.universityId,
    name: program.name,
    status: statusOf(programStatus, program.id),
    courseCount: courses.filter(
      (course) => semesterById(course.semesterId)?.programId === program.id,
    ).length,
  }));
}

export function listCatalogSemesters(): AdminSemester[] {
  return semesters.map((semester) => {
    const program = programById(semester.programId);
    const inSemester = courses.filter((course) => course.semesterId === semester.id);
    return {
      id: semester.id,
      programId: semester.programId,
      programName: program?.name ?? semester.programId,
      universityShortName: universityById(program?.universityId ?? '')?.shortName ?? '',
      number: semester.number,
      status: statusOf(semesterStatus, semester.id),
      courseCount: inSemester.length,
      publishedCourseCount: inSemester.filter(
        (course) => courseMeta.get(course.id)?.status === 'PUBLISHED',
      ).length,
    };
  });
}

// ---------- writes ----------

const sameText = (a: string, b: string): boolean =>
  a.trim().toLowerCase() === b.trim().toLowerCase();

function requireReason(from: CatalogStatus, to: CatalogStatus, reason: string | undefined): void {
  if (needsReasonToChange(from, to) && !reason) throw new ApiError(ADMIN_ERROR_CODES.VALIDATION_FAILED);
}

function assertCodeFree(semesterId: string, code: string, ownId?: string): void {
  const taken = courses.some(
    (course) =>
      course.semesterId === semesterId &&
      course.id !== ownId &&
      normalizeCourseCode(course.code) === code,
  );
  if (taken) throw new ApiError(ADMIN_ERROR_CODES.CODE_DUPLICATE);
}

function assertSharedCodeFree(semesterNumber: number, code: string, ownId?: string): void {
  const taken = sharedCourses.some(
    (course) =>
      course.semesterNumber === semesterNumber &&
      course.id !== ownId &&
      normalizeCourseCode(course.code) === code,
  );
  if (taken) throw new ApiError(ADMIN_ERROR_CODES.CODE_DUPLICATE);
}

export function createCatalogCourse(input: CreateCourseInput): AdminCourse {
  const code = normalizeCourseCode(input.code);

  if (input.universityId === ALL_UNIVERSITIES) {
    if (input.semesterNumber === undefined) throw new ApiError(ADMIN_ERROR_CODES.VALIDATION_FAILED);
    assertSharedCodeFree(input.semesterNumber, code);
    const id = `all-s${input.semesterNumber}-${code.toLowerCase()}`;
    sharedCourses.push({
      id,
      semesterNumber: input.semesterNumber,
      code,
      title: input.title.trim(),
      stream: input.stream,
    });
    courseMeta.set(id, { status: input.status, freeTrialItems: input.freeTrialItems });
    return toCourse(id);
  }

  const semester = input.semesterId ? semesterById(input.semesterId) : undefined;
  const program = semester && programById(semester.programId);
  if (!semester || !program || program.universityId !== input.universityId) {
    throw new ApiError(ADMIN_ERROR_CODES.NOT_FOUND);
  }
  assertCodeFree(semester.id, code);

  const id = `${semester.id}-${code.toLowerCase()}`;
  courses.push({
    id,
    semesterId: semester.id,
    code,
    title: input.title.trim(),
    stream: input.stream,
  });
  courseMeta.set(id, { status: input.status, freeTrialItems: input.freeTrialItems });
  return toCourse(id);
}

export function updateCatalogCourse(
  id: string,
  input: UpdateCourseInput,
): { course: AdminCourse; before: CatalogStatus } {
  const shared = sharedCourses.find((candidate) => candidate.id === id);
  const course = shared ?? courseById(id);
  const meta = courseMeta.get(id);
  if (!course || !meta) throw new ApiError(ADMIN_ERROR_CODES.NOT_FOUND);

  const code = normalizeCourseCode(input.code);
  if (shared) assertSharedCodeFree(shared.semesterNumber, code, id);
  else if ('semesterId' in course) assertCodeFree(course.semesterId, code, id);
  requireReason(meta.status, input.status, input.reason);

  const before = meta.status;
  course.code = code;
  course.title = input.title.trim();
  course.stream = input.stream;
  courseMeta.set(id, { status: input.status, freeTrialItems: input.freeTrialItems });
  return { course: toCourse(id), before };
}

/** A course that students already have in their list cannot be deleted; make it inactive instead. */
export function deleteCatalogCourse(id: string): AdminCourse {
  const removed = toCourse(id);
  if (countStudents('course', id) > 0) throw new ApiError(ADMIN_ERROR_CODES.IN_USE);
  const shared = sharedCourses.findIndex((candidate) => candidate.id === id);
  if (shared >= 0) sharedCourses.splice(shared, 1);
  else courses.splice(courses.findIndex((candidate) => candidate.id === id), 1);
  courseMeta.delete(id);
  return removed;
}

function assertUniversityFree(input: UniversityInput, ownId?: string): void {
  const taken = universities.some(
    (university) =>
      university.id !== ownId &&
      (sameText(university.name, input.name) || sameText(university.shortName, input.shortName)),
  );
  if (taken) throw new ApiError(ADMIN_ERROR_CODES.NAME_DUPLICATE);
}

function toUniversity(id: string): AdminUniversity {
  const found = listCatalogUniversities().find((university) => university.id === id);
  if (!found) throw new ApiError(ADMIN_ERROR_CODES.NOT_FOUND);
  return found;
}

export function createCatalogUniversity(input: UniversityInput): AdminUniversity {
  assertUniversityFree(input);
  const id = slugify(input.shortName);
  universities.push({ id, name: input.name.trim(), shortName: input.shortName.trim() });
  universityStatus.set(id, input.status);
  return toUniversity(id);
}

export function updateCatalogUniversity(
  id: string,
  input: UniversityInput,
): { university: AdminUniversity; before: CatalogStatus } {
  const university = universityById(id);
  if (!university) throw new ApiError(ADMIN_ERROR_CODES.NOT_FOUND);
  assertUniversityFree(input, id);
  const before = statusOf(universityStatus, id);
  requireReason(before, input.status, input.reason);

  university.name = input.name.trim();
  university.shortName = input.shortName.trim();
  universityStatus.set(id, input.status);
  return { university: toUniversity(id), before };
}

function assertProgramFree(input: ProgramInput, ownId?: string): void {
  const taken = programs.some(
    (program) =>
      program.id !== ownId &&
      program.universityId === input.universityId &&
      sameText(program.name, input.name),
  );
  if (taken) throw new ApiError(ADMIN_ERROR_CODES.NAME_DUPLICATE);
}

function toProgram(id: string): AdminProgram {
  const found = listCatalogPrograms().find((program) => program.id === id);
  if (!found) throw new ApiError(ADMIN_ERROR_CODES.NOT_FOUND);
  return found;
}

/** A new program always gets its two freshman semesters. */
export function createCatalogProgram(input: ProgramInput): AdminProgram {
  if (!universityById(input.universityId)) throw new ApiError(ADMIN_ERROR_CODES.NOT_FOUND);
  assertProgramFree(input);
  const id = `${input.universityId}-${slugify(input.name)}`;
  programs.push({ id, universityId: input.universityId, name: input.name.trim() });
  programStatus.set(id, input.status);
  semesters.push(
    { id: `${id}-s1`, programId: id, number: 1 },
    { id: `${id}-s2`, programId: id, number: 2 },
  );
  semesterStatus.set(`${id}-s1`, 'PUBLISHED');
  semesterStatus.set(`${id}-s2`, 'PUBLISHED');
  return toProgram(id);
}

/** The university of a program cannot change, because students and courses hang under it. */
export function updateCatalogProgram(
  id: string,
  input: ProgramInput,
): { program: AdminProgram; before: CatalogStatus } {
  const program = programById(id);
  if (!program) throw new ApiError(ADMIN_ERROR_CODES.NOT_FOUND);
  const next = { ...input, universityId: program.universityId };
  assertProgramFree(next, id);
  const before = statusOf(programStatus, id);
  requireReason(before, input.status, input.reason);

  program.name = input.name.trim();
  programStatus.set(id, input.status);
  return { program: toProgram(id), before };
}

export function deleteCatalogUniversity(id: string): AdminUniversity {
  const removed = toUniversity(id);
  if (removed.programCount > 0 || countStudents('university', id) > 0) {
    throw new ApiError(ADMIN_ERROR_CODES.IN_USE);
  }
  universities.splice(universities.findIndex((candidate) => candidate.id === id), 1);
  universityStatus.delete(id);
  return removed;
}

/** A program with courses or students cannot be deleted. Its empty semesters go with it. */
export function deleteCatalogProgram(id: string): AdminProgram {
  const removed = toProgram(id);
  if (removed.courseCount > 0 || countStudents('program', id) > 0) {
    throw new ApiError(ADMIN_ERROR_CODES.IN_USE);
  }
  for (let index = semesters.length - 1; index >= 0; index -= 1) {
    const semester = semesters[index];
    if (semester && semester.programId === id) {
      semesterStatus.delete(semester.id);
      semesters.splice(index, 1);
    }
  }
  programs.splice(programs.findIndex((candidate) => candidate.id === id), 1);
  programStatus.delete(id);
  return removed;
}

function toSemester(id: string): AdminSemester {
  const found = listCatalogSemesters().find((semester) => semester.id === id);
  if (!found) throw new ApiError(ADMIN_ERROR_CODES.NOT_FOUND);
  return found;
}

export function updateCatalogSemester(
  id: string,
  input: SemesterStatusInput,
): { semester: AdminSemester; before: CatalogStatus } {
  if (!semesterById(id)) throw new ApiError(ADMIN_ERROR_CODES.NOT_FOUND);
  const before = statusOf(semesterStatus, id);
  requireReason(before, input.status, input.reason);
  semesterStatus.set(id, input.status);
  return { semester: toSemester(id), before };
}

export function deleteCatalogSemester(id: string): AdminSemester {
  const removed = toSemester(id);
  if (removed.courseCount > 0 || countStudents('semester', id) > 0) {
    throw new ApiError(ADMIN_ERROR_CODES.IN_USE);
  }
  semesters.splice(semesters.findIndex((candidate) => candidate.id === id), 1);
  semesterStatus.delete(id);
  return removed;
}
