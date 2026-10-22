// apps/admin-web/src/core/mock/data/students.ts
import type {
  CreateStudentInput,
  StudentCourse,
  StudentDetail,
  StudentListQuery,
  StudentListResult,
  StudentSummary,
} from '@mastara/contracts';
import { studentListQuerySchema } from '@mastara/contracts';
import { accessEndAfterGrant, courseAccessState, deriveStudentAccess, ADMIN_ERROR_CODES, isExtension, normalizeIdentifier, RENEWAL_WINDOW_DAYS, STUDENTS_PAGE_SIZE } from '@mastara/domain';
import type {
  DeviceStatus,
  StudentAccessState,
  StudentStatus,
  StudentStream,
} from '@mastara/domain';

import { ApiError } from '@/core/network';

import {
  courseById,
  coursesForScope,
  programById,
  programs,
  semesterById,
  universityById,
} from './catalog';
import { registerCatalogUsage } from './catalogAdmin';

/**
 * In-memory "server" state for students, shared by every mock admin API. About 2,400 students are
 * generated the same way every time, so screens look the same after a reload. Payment-related access
 * is wired to the Payments mock in F11g; the real database replaces all of this in backend phase B3.
 */

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;
const TOTAL_STUDENTS = 2458;

interface CourseEntry {
  courseId: string;
  stored: 'PAID' | 'PENDING' | 'FREE_TRIAL';
  /** ms. Paid entries only. */
  expiresAtMs?: number;
}

interface StudentRecord {
  id: string;
  name: string;
  identifier: string;
  universityId: string;
  programId: string;
  semesterId: string;
  stream: StudentStream;
  status: StudentStatus;
  device: DeviceStatus;
  boundAtMs?: number;
  lastSeenAtMs?: number;
  entries: CourseEntry[];
}

// ---------- deterministic generation ----------

function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const FIRST_NAMES = [
  'Abel',
  'Alemu',
  'Almaz',
  'Amanuel',
  'Bethlehem',
  'Biniyam',
  'Birtukan',
  'Dawit',
  'Eden',
  'Eyerusalem',
  'Fikir',
  'Genet',
  'Hanna',
  'Henok',
  'Kalkidan',
  'Kidus',
  'Lidya',
  'Mekdes',
  'Meron',
  'Mulu',
  'Nardos',
  'Natnael',
  'Rediet',
  'Robel',
  'Ruth',
  'Saron',
  'Selamawit',
  'Sisay',
  'Tigist',
  'Tsion',
  'Yared',
  'Yodit',
  'Yohannes',
  'Zelalem',
  'Zerihun',
];
const FATHER_NAMES = [
  'Abebe',
  'Alemayehu',
  'Assefa',
  'Bekele',
  'Belay',
  'Demissie',
  'Desta',
  'Endale',
  'Fekadu',
  'Gebre',
  'Girma',
  'Haile',
  'Kassa',
  'Lemma',
  'Mamo',
  'Mengistu',
  'Mulugeta',
  'Negash',
  'Tadesse',
  'Tesfaye',
  'Teshome',
  'Wondimu',
  'Worku',
  'Yimer',
  'Zewdu',
];

const pick = <T>(list: readonly T[], random: () => number): T =>
  list[Math.floor(random() * list.length)] as T;

/** The first five students match the approved design sheets. */
const SEED_STUDENTS: readonly StudentRecord[] = [
  {
    id: 'MS0001',
    name: 'Abebe Kebede',
    identifier: '0911000001',
    universityId: 'aastu',
    programId: 'aastu-se',
    semesterId: 'aastu-se-s1',
    stream: 'NATURAL',
    status: 'ACTIVE',
    device: 'BOUND',
    entries: [],
  },
  {
    id: 'MS0002',
    name: 'Selam Getachew',
    identifier: '0911000002',
    universityId: 'bdu',
    programId: 'bdu-acc',
    semesterId: 'bdu-acc-s1',
    stream: 'SOCIAL',
    status: 'ACTIVE',
    device: 'BOUND',
    entries: [],
  },
  {
    id: 'MS0003',
    name: 'Yonas Girma',
    identifier: 'yonas.girma@example.com',
    universityId: 'ju',
    programId: 'ju-med',
    semesterId: 'ju-med-s1',
    stream: 'NATURAL',
    status: 'ACTIVE',
    device: 'RELEASED',
    entries: [],
  },
  {
    id: 'MS0004',
    name: 'Hana Mohammed',
    identifier: '0911000004',
    universityId: 'mu',
    programId: 'mu-law',
    semesterId: 'mu-law-s1',
    stream: 'SOCIAL',
    status: 'ACTIVE',
    device: 'BOUND',
    entries: [],
  },
  {
    id: 'MS0005',
    name: 'Biruk Alemu',
    identifier: '0911000005',
    universityId: 'aastu',
    programId: 'aastu-ce',
    semesterId: 'aastu-ce-s1',
    stream: 'NATURAL',
    status: 'ACTIVE',
    device: 'BOUND',
    entries: [],
  },
];

type Profile = 'PAID' | 'PENDING' | 'FREE_TRIAL' | 'EXPIRED';

function entriesFor(
  record: Pick<StudentRecord, 'semesterId' | 'stream'>,
  profile: Profile,
  random: () => number,
  now: number,
  count?: number,
): CourseEntry[] {
  const available = coursesForScope(record.semesterId, record.stream);
  const total = Math.min(count ?? 1 + Math.floor(random() * available.length), available.length);
  return available.slice(0, total).map((course, index): CourseEntry => {
    const base = { courseId: course.id };
    switch (profile) {
      case 'PAID':
        // Most courses are paid; the last one is still on the free trial.
        return index === total - 1 && total > 2
          ? { ...base, stored: 'FREE_TRIAL' }
          : {
              ...base,
              stored: 'PAID',
              expiresAtMs: now + (4 + Math.floor(random() * 140)) * DAY_MS,
            };
      case 'EXPIRED':
        return {
          ...base,
          stored: 'PAID',
          expiresAtMs: now - (1 + Math.floor(random() * 60)) * DAY_MS,
        };
      case 'PENDING':
        return { ...base, stored: index % 2 === 0 ? 'PENDING' : 'FREE_TRIAL' };
      case 'FREE_TRIAL':
        return { ...base, stored: 'FREE_TRIAL' };
    }
  });
}

function generate(now: number): StudentRecord[] {
  const list: StudentRecord[] = [];

  SEED_STUDENTS.forEach((seed, index) => {
    const random = mulberry32(index + 1);
    const profiles: Profile[] = ['PAID', 'PENDING', 'FREE_TRIAL', 'EXPIRED', 'PAID'];
    const profile = profiles[index] as Profile;
    const counts = [6, 5, 3, 6, 6];
    list.push({
      ...seed,
      boundAtMs: seed.device === 'BOUND' ? now - (20 + index * 9) * DAY_MS : undefined,
      lastSeenAtMs: now - (5 + index * 47) * MINUTE_MS,
      entries: entriesFor(seed, profile, random, now, counts[index]),
    });
  });

  for (let n = SEED_STUDENTS.length + 1; n <= TOTAL_STUDENTS; n += 1) {
    const random = mulberry32(n * 7919);
    const program = pick(programs, random);
    const stream: StudentStream = random() < 0.55 ? 'NATURAL' : 'SOCIAL';
    const semesterId = `${program.id}-s${random() < 0.75 ? 1 : 2}`;
    const roll = random();
    const profile: Profile =
      roll < 0.45 ? 'PAID' : roll < 0.53 ? 'PENDING' : roll < 0.78 ? 'FREE_TRIAL' : 'EXPIRED';
    const device: DeviceStatus =
      random() < (profile === 'FREE_TRIAL' ? 0.7 : 0.9) ? 'BOUND' : 'RELEASED';
    const name = `${pick(FIRST_NAMES, random)} ${pick(FATHER_NAMES, random)}`;
    const identifier =
      random() < 0.82
        ? `09${String(10_000_000 + Math.floor(random() * 89_999_999))}`
        : `${name.toLowerCase().replace(/\s+/g, '.')}${n}@example.com`;
    const record = { semesterId, stream };

    list.push({
      id: `MS${String(n).padStart(4, '0')}`,
      name,
      identifier,
      universityId: program.universityId,
      programId: program.id,
      semesterId,
      stream,
      status: random() < 0.01 ? 'SUSPENDED' : 'ACTIVE',
      device,
      boundAtMs: device === 'BOUND' ? now - (1 + Math.floor(random() * 120)) * DAY_MS : undefined,
      lastSeenAtMs: now - Math.floor(random() * 14 * DAY_MS),
      entries: entriesFor(record, profile, random, now),
    });
  }
  return list;
}

const students: StudentRecord[] = generate(Date.now());
let nextNumber = TOTAL_STUDENTS + 1;

// ---------- mapping to contracts ----------

function courseStates(record: StudentRecord, now: number): StudentAccessState[] {
  return record.entries.map((entry) => courseAccessState(entry.stored, entry.expiresAtMs, now));
}

function toSummary(record: StudentRecord, now: number): StudentSummary {
  const university = universityById(record.universityId);
  return {
    id: record.id,
    studentCode: record.id,
    name: record.name,
    identifier: record.identifier,
    universityId: record.universityId,
    universityShortName: university?.shortName ?? record.universityId,
    stream: record.stream,
    courseCount: record.entries.length,
    status: record.status,
    device: record.device,
    access: deriveStudentAccess(courseStates(record, now)),
  };
}

function toDetail(record: StudentRecord, now: number): StudentDetail {
  const semester = semesterById(record.semesterId);
  const courses = record.entries.map((entry): StudentCourse => {
    const course = courseById(entry.courseId);
    return {
      courseId: entry.courseId,
      code: course?.code ?? entry.courseId,
      title: course?.title ?? entry.courseId,
      stream: course?.stream ?? 'COMMON',
      access: courseAccessState(entry.stored, entry.expiresAtMs, now),
      expiresAt:
        entry.expiresAtMs !== undefined ? new Date(entry.expiresAtMs).toISOString() : undefined,
    };
  });
  return {
    ...toSummary(record, now),
    programName: programById(record.programId)?.name ?? record.programId,
    semesterNumber: semester?.number ?? 1,
    boundAt: record.boundAtMs !== undefined ? new Date(record.boundAtMs).toISOString() : undefined,
    lastSeenAt:
      record.lastSeenAtMs !== undefined ? new Date(record.lastSeenAtMs).toISOString() : undefined,
    courses,
  };
}

function find(id: string): StudentRecord {
  const record = students.find((candidate) => candidate.id === id);
  if (!record) throw new ApiError(ADMIN_ERROR_CODES.NOT_FOUND);
  return record;
}

// ---------- reads ----------

export function listStudents(rawQuery: StudentListQuery = {}, now = Date.now()): StudentListResult {
  const query = studentListQuerySchema.parse(rawQuery);
  const text = query.q?.trim().toLowerCase() ?? '';
  const textDigits = normalizeIdentifier(text);

  const matches = students.filter((record) => {
    if (query.universityId && record.universityId !== query.universityId) return false;
    if (query.stream && record.stream !== query.stream) return false;
    if (text) {
      const found =
        record.id.toLowerCase().includes(text) ||
        record.name.toLowerCase().includes(text) ||
        record.identifier.toLowerCase().includes(text) ||
        normalizeIdentifier(record.identifier) === textDigits;
      if (!found) return false;
    }
    return !query.access || deriveStudentAccess(courseStates(record, now)) === query.access;
  });

  const pageCount = Math.max(1, Math.ceil(matches.length / STUDENTS_PAGE_SIZE));
  const page = Math.min(query.page, pageCount);
  const start = (page - 1) * STUDENTS_PAGE_SIZE;
  return {
    items: matches.slice(start, start + STUDENTS_PAGE_SIZE).map((record) => toSummary(record, now)),
    total: matches.length,
    page,
    pageCount,
  };
}

export function getStudent(id: string, now = Date.now()): StudentDetail {
  return toDetail(find(id), now);
}

/** Numbers for the dashboard. */
export function studentStats(now = Date.now()): {
  activeStudents: number;
  activeEntitlements: number;
  expiringSoon: number;
} {
  let activeStudents = 0;
  let activeEntitlements = 0;
  let expiringSoon = 0;
  for (const record of students) {
    if (record.status === 'ACTIVE') activeStudents += 1;
    for (const entry of record.entries) {
      if (courseAccessState(entry.stored, entry.expiresAtMs, now) !== 'PAID') continue;
      activeEntitlements += 1;
      if ((entry.expiresAtMs ?? 0) - now <= RENEWAL_WINDOW_DAYS * DAY_MS) expiringSoon += 1;
    }
  }
  return { activeStudents, activeEntitlements, expiringSoon };
}

// ---------- writes (the server rules; the mock API adds the audit entry) ----------

export function createStudent(input: CreateStudentInput, now = Date.now()): StudentDetail {
  const key = normalizeIdentifier(input.identifier);
  if (students.some((record) => normalizeIdentifier(record.identifier) === key)) {
    throw new ApiError(ADMIN_ERROR_CODES.IDENTIFIER_DUPLICATE);
  }
  const program = programById(input.programId);
  const semester = semesterById(input.semesterId);
  if (
    !program ||
    !semester ||
    semester.programId !== program.id ||
    program.universityId !== input.universityId
  ) {
    throw new ApiError(ADMIN_ERROR_CODES.VALIDATION_FAILED);
  }

  const record: StudentRecord = {
    id: `MS${String(nextNumber).padStart(4, '0')}`,
    name: input.name.trim(),
    identifier: input.identifier.trim(),
    universityId: input.universityId,
    programId: input.programId,
    semesterId: input.semesterId,
    stream: input.stream,
    status: 'ACTIVE',
    // The student registers a phone at first sign-in.
    device: 'RELEASED',
    entries: [],
  };
  nextNumber += 1;
  students.push(record);
  return toDetail(record, now);
}

export function setStudentStatus(
  id: string,
  status: StudentStatus,
  now = Date.now(),
): StudentDetail {
  const record = find(id);
  if (record.status === status) throw new ApiError(ADMIN_ERROR_CODES.INVALID_STATE);
  record.status = status;
  return toDetail(record, now);
}

export function revokeStudentDevice(id: string, now = Date.now()): StudentDetail {
  const record = find(id);
  if (record.device !== 'BOUND') throw new ApiError(ADMIN_ERROR_CODES.INVALID_STATE);
  record.device = 'RELEASED';
  record.boundAtMs = undefined;
  return toDetail(record, now);
}

/** Adds days to one course in the list. Returns the new detail and whether it extended active access. */
export function grantStudentAccess(
  id: string,
  courseId: string,
  days: number,
  now = Date.now(),
): { detail: StudentDetail; extended: boolean } {
  const record = find(id);
  const entry = record.entries.find((candidate) => candidate.courseId === courseId);
  if (!entry) throw new ApiError(ADMIN_ERROR_CODES.NOT_FOUND);

  const currentEnd = entry.stored === 'PAID' ? entry.expiresAtMs : undefined;
  const extended = isExtension(currentEnd, now);
  entry.stored = 'PAID';
  entry.expiresAtMs = accessEndAfterGrant(currentEnd, days, now);
  return { detail: toDetail(record, now), extended };
}

// ---------- payments (F11g) ----------

/** What the Payments mock needs to know about a student to build or settle an order. */
export interface PaymentCandidate {
  id: string;
  name: string;
  universityId: string;
  programId: string;
  stream: StudentStream;
  /** Courses the student is waiting on (stored as PENDING). */
  pendingCourseIds: string[];
  /** Courses the student has already paid for. */
  paidCourseIds: string[];
}

export function paymentCandidates(): PaymentCandidate[] {
  return students.map((record) => ({
    id: record.id,
    name: record.name,
    universityId: record.universityId,
    programId: record.programId,
    stream: record.stream,
    pendingCourseIds: record.entries
      .filter((entry) => entry.stored === 'PENDING')
      .map((entry) => entry.courseId),
    paidCourseIds: record.entries
      .filter((entry) => entry.stored === 'PAID')
      .map((entry) => entry.courseId),
  }));
}

/** Approval: each course becomes paid for `days`; a course not in the list yet is added. */
export function unlockStudentCourses(
  id: string,
  courseIds: readonly string[],
  days: number,
  now = Date.now(),
): void {
  const record = find(id);
  for (const courseId of courseIds) {
    const entry = record.entries.find((candidate) => candidate.courseId === courseId);
    if (!entry) {
      record.entries.push({
        courseId,
        stored: 'PAID',
        expiresAtMs: accessEndAfterGrant(undefined, days, now),
      });
      continue;
    }
    const currentEnd = entry.stored === 'PAID' ? entry.expiresAtMs : undefined;
    entry.stored = 'PAID';
    entry.expiresAtMs = accessEndAfterGrant(currentEnd, days, now);
  }
}

/** Rejection: courses that were waiting for this payment go back to the free trial. */
export function releasePendingCourses(id: string, courseIds: readonly string[]): void {
  const record = find(id);
  for (const entry of record.entries) {
    if (entry.stored === 'PENDING' && courseIds.includes(entry.courseId)) {
      entry.stored = 'FREE_TRIAL';
    }
  }
}

/** Tells the catalog how many students use a university, program, semester or course, so used entries cannot be deleted. */
registerCatalogUsage((kind, id) =>
  students.filter((record) => {
    if (kind === 'university') return record.universityId === id;
    if (kind === 'program') return record.programId === id;
    if (kind === 'semester') return record.semesterId === id;
    return record.entries.some((entry) => entry.courseId === id);
  }).length,
);
