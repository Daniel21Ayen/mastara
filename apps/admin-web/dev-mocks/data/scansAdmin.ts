// apps/admin-web/src/core/mock/data/scansAdmin.ts
import type {
  AdminScan,
  ScanCourseOption,
  ScanFile,
  ScanInput,
  ScanListQuery,
  ScanListResult,
} from '@mastara/contracts';
import { scanListQuerySchema } from '@mastara/contracts';
import { ADMIN_ERROR_CODES, SCAN_PAGE_SIZE } from '@mastara/domain';
import type { Stream } from '@mastara/domain';

import { ApiError } from '@/core/network';

import { courseById, courses, programById, semesters, universityById } from './catalog';
import { listCourseModules } from './contentAdmin';

/**
 * Mock scan records for the Admin Scan to PDF page. A scan keeps the details of its pages and answer
 * files (names and sizes); the backend phase stores the files and joins the pages into one PDF.
 * Checks that the chosen university, program, semester, stream, course and topic belong together.
 */

const HOUR_MS = 3_600_000;

interface ScanRecord extends AdminScan {
  createdAtMs: number;
}

const scans: ScanRecord[] = [];
let seeded = false;
let created = 0;

const pdf = (name: string, sizeBytes: number): ScanFile => ({
  name,
  mime: 'application/pdf',
  sizeBytes,
});
const jpg = (name: string, sizeBytes: number): ScanFile => ({
  name,
  mime: 'image/jpeg',
  sizeBytes,
});

// ---------- resolving a scan input ----------

function checkWhere(input: { universityId: string; programId: string }) {
  const university = universityById(input.universityId);
  const program = programById(input.programId);
  if (!university || !program || program.universityId !== university.id) {
    throw new ApiError(ADMIN_ERROR_CODES.NOT_FOUND);
  }
  return { university, program };
}

function checkScope(input: {
  universityId: string;
  programId: string;
  semesterNumber: 1 | 2;
  stream: Stream;
  courseId: string;
}) {
  const { university, program } = checkWhere(input);
  const semester = semesters.find(
    (item) => item.programId === program.id && item.number === input.semesterNumber,
  );
  const course = courseById(input.courseId);
  if (!semester || !course || course.semesterId !== semester.id || course.stream !== input.stream) {
    throw new ApiError(ADMIN_ERROR_CODES.NOT_FOUND);
  }
  return { university, program, course };
}

function topicLabel(courseId: string, topicId: string): string {
  for (const module of listCourseModules(courseId)) {
    const topic = module.topics.find((item) => item.id === topicId);
    if (topic) return `${topic.code} ${topic.title.en}`;
  }
  throw new ApiError(ADMIN_ERROR_CODES.NOT_FOUND);
}

const blank = {
  subKind: null,
  examSetId: null,
  semesterNumber: null,
  stream: null,
  courseCode: null,
  courseTitle: null,
  year: null,
  topicLabel: null,
  title: null,
  description: null,
  answers: [],
} satisfies Partial<AdminScan>;

/** The stored fields for an input, after checking the choices belong together. */
function resolve(input: ScanInput): Omit<AdminScan, 'id' | 'createdAt'> {
  const trimmed = (text: string) => text.trim();
  switch (input.kind) {
    case 'COC': {
      const { university, program } = checkWhere(input);
      return {
        ...blank,
        kind: 'COC',
        universityShortName: university.shortName,
        programName: program.name,
        year: input.year,
        pages: input.pages,
        answers: input.answers.map((a) => ({
          questionId: trimmed(a.questionId),
          questionType: null,
          text: trimmed(a.text),
          file: a.file,
        })),
      };
    }
    case 'EXAM': {
      const { university, program, course } = checkScope(input);
      return {
        ...blank,
        kind: 'EXAM',
        subKind: input.examKind,
        examSetId: trimmed(input.examSetId),
        universityShortName: university.shortName,
        programName: program.name,
        semesterNumber: input.semesterNumber,
        stream: input.stream,
        courseCode: course.code,
        courseTitle: course.title,
        pages: input.pages,
        answers: input.answers.map((a) => ({
          questionId: trimmed(a.questionId),
          questionType: a.questionType,
          text: trimmed(a.text),
          file: a.file,
        })),
      };
    }
    default: {
      const { university, program, course } = checkScope(input);
      const material = input.kind === 'MATERIAL';
      return {
        ...blank,
        kind: input.kind,
        subKind: material ? input.materialKind : String(input.quizNo),
        examSetId: trimmed(input.examSetId),
        universityShortName: university.shortName,
        programName: program.name,
        semesterNumber: input.semesterNumber,
        stream: input.stream,
        courseCode: course.code,
        courseTitle: course.title,
        topicLabel: topicLabel(course.id, input.topicId),
        title: trimmed(input.title),
        description: trimmed(input.description),
        pages: input.pages,
        answers: material
          ? []
          : input.answers.map((a) => ({
              questionId: trimmed(a.questionId),
              questionType: null,
              text: trimmed(a.text),
              file: a.file,
            })),
      };
    }
  }
}

// ---------- seed ----------

function firstTopic(courseId: string): string {
  return listCourseModules(courseId)[0]?.topics[0]?.id ?? '';
}

function ensureSeed(now = Date.now()): void {
  if (seeded) return;
  seeded = true;
  const course = 'aastu-se-s1-eng101';
  const science = 'bdu-cs-s2-mat102';
  const scope = (
    courseId: string,
    programId: string,
    universityId: string,
    semesterNumber: 1 | 2,
    stream: Stream,
  ) => ({
    universityId,
    programId,
    semesterNumber,
    stream,
    courseId,
  });
  const seedInputs: { input: ScanInput; agoH: number }[] = [
    {
      agoH: 3,
      input: {
        kind: 'QUIZ',
        quizNo: 2,
        examSetId: 'QS-204',
        ...scope(course, 'aastu-se', 'aastu', 1, 'COMMON'),
        topicId: firstTopic(course),
        title: 'Quiz 2 paper scan',
        description: 'Scanned from the teacher copy.',
        pages: [jpg('quiz2-p1.jpg', 420_000), jpg('quiz2-p2.jpg', 395_000)],
        answers: [
          { questionId: 'Q-1006', text: 'B', file: null },
          { questionId: 'Q-1007', text: '', file: jpg('q1007-answer.jpg', 180_000) },
        ],
      },
    },
    {
      agoH: 10,
      input: {
        kind: 'EXAM',
        examKind: 'MID',
        examSetId: 'MID-2016',
        ...scope(science, 'bdu-cs', 'bdu', 2, 'NATURAL'),
        pages: [pdf('mid-calculus.pdf', 2_300_000)],
        answers: [
          { questionId: 'E-01', questionType: 'MULTIPLE_CHOICE', text: 'C', file: null },
          {
            questionId: 'E-02',
            questionType: 'SHORT_ANSWER',
            text: '',
            file: pdf('e02.pdf', 640_000),
          },
        ],
      },
    },
    {
      agoH: 28,
      input: {
        kind: 'COC',
        universityId: 'ju',
        programId: 'ju-med',
        year: 2016,
        pages: [pdf('coc-medicine-2016.pdf', 4_800_000)],
        answers: [
          { questionId: '1', text: 'D', file: null },
          { questionId: '2', text: 'A', file: null },
          { questionId: '3', text: '', file: jpg('coc-3.jpg', 210_000) },
        ],
      },
    },
    {
      agoH: 52,
      input: {
        kind: 'MATERIAL',
        materialKind: 'NOTE',
        examSetId: 'MAT-01',
        ...scope(course, 'aastu-se', 'aastu', 1, 'COMMON'),
        topicId: firstTopic(course),
        title: 'Grammar handout',
        description: 'Handwritten lecture note, 3 pages.',
        pages: [
          jpg('grammar-1.jpg', 300_000),
          jpg('grammar-2.jpg', 310_000),
          jpg('grammar-3.jpg', 290_000),
        ],
      },
    },
  ];
  seedInputs.forEach(({ input, agoH }, index) => {
    const when = now - agoH * HOUR_MS;
    scans.push({
      id: `SC-${1001 + index}`,
      ...resolve(input),
      createdAt: new Date(when).toISOString(),
      createdAtMs: when,
    });
  });
}

// ---------- reads ----------

const strip = ({ createdAtMs: _ms, ...scan }: ScanRecord): AdminScan => scan;

export function listScans(rawQuery: ScanListQuery): ScanListResult {
  ensureSeed();
  const query = scanListQuerySchema.parse(rawQuery);
  const needle = query.q?.trim().toLowerCase();
  const rows = scans
    .filter((scan) => {
      if (query.kind && scan.kind !== query.kind) return false;
      if (needle) {
        const text = [
          scan.id,
          scan.examSetId,
          scan.title,
          scan.courseCode,
          scan.courseTitle,
          scan.universityShortName,
          scan.programName,
          scan.topicLabel,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!text.includes(needle)) return false;
      }
      return true;
    })
    .sort((a, b) => b.createdAtMs - a.createdAtMs);
  const pageCount = Math.max(1, Math.ceil(rows.length / SCAN_PAGE_SIZE));
  const page = Math.min(query.page, pageCount);
  const start = (page - 1) * SCAN_PAGE_SIZE;
  return {
    items: rows.slice(start, start + SCAN_PAGE_SIZE).map(strip),
    total: rows.length,
    page,
    pageCount,
  };
}

export function getScan(id: string): AdminScan {
  ensureSeed();
  const record = scans.find((scan) => scan.id === id);
  if (!record) throw new ApiError(ADMIN_ERROR_CODES.NOT_FOUND);
  return strip(record);
}

/** Courses of a program's semester for one stream, for the scan form. */
export function listScanCourses(
  programId: string,
  semesterNumber: 1 | 2,
  stream: Stream,
): ScanCourseOption[] {
  const semester = semesters.find(
    (item) => item.programId === programId && item.number === semesterNumber,
  );
  if (!semester) return [];
  return courses
    .filter((course) => course.semesterId === semester.id && course.stream === stream)
    .map((course) => ({ id: course.id, code: course.code, title: course.title }));
}

// ---------- writes (the mock API adds the audit entry) ----------

export function createScan(input: ScanInput, now = Date.now()): AdminScan {
  ensureSeed();
  const resolved = resolve(input);
  created += 1;
  const record: ScanRecord = {
    id: `SC-${9000 + created}`,
    ...resolved,
    createdAt: new Date(now).toISOString(),
    createdAtMs: now,
  };
  scans.push(record);
  return strip(record);
}
