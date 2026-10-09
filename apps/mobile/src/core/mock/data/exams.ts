// apps/mobile/src/core/mock/data/exams.ts
import type { CocSet, Course, Exam, Question, QuizChapter } from '@mastara/contracts';
import { EXAM_KINDS } from '@mastara/domain';
import type { ExamKind } from '@mastara/domain';

import { courses } from './courses';
import { buildChapters, buildQuestions } from './quizzes';
import { universities } from './universities';

const EXAM_MINUTES = 30;
const COC_MINUTES = 45;
const COC_SET_COUNT = 3;
const COC_MAX_COURSES = 8;
const QUESTIONS_PER_COC_COURSE = 3;

export function examId(courseId: string, kind: ExamKind, universityId: string): string {
  return `${courseId}~${kind}~${universityId}`;
}

/** One exam per university for each kind. The first university of each kind is the free sample. */
export function buildExams(course: Course): Exam[] {
  return EXAM_KINDS.flatMap((kind) =>
    universities.map(
      (university, index): Exam => ({
        id: examId(course.id, kind, university.id),
        courseId: course.id,
        universityId: university.id,
        kind,
        questionCount: 20,
        minutes: EXAM_MINUTES,
        isFree: index === 0,
      }),
    ),
  );
}

export function findExam(id: string): Exam | null {
  const course = courses.find((item) => item.id === id.split('~')[0]);
  return course ? (buildExams(course).find((exam) => exam.id === id) ?? null) : null;
}

/** An exam holds 20 questions: two generated chapters of 10, each seeded by the exam ID. */
export function buildExamQuestions(exam: Exam): Question[] {
  return [1, 2].flatMap((part) => {
    const chapter: QuizChapter = {
      id: `${exam.id}#${part}`,
      courseId: exam.courseId,
      quizNo: 1,
      chapterNumber: part,
      title: { en: `Part ${part}`, am: `ክፍል ${part}` },
      questionCount: 10,
      minutes: EXAM_MINUTES,
      isFree: false,
    };
    return buildQuestions(chapter);
  });
}

// ---- COC: independent of Exams, mixes questions from all of the student's courses ----

function cocCourses(courseIds: readonly string[]): Course[] {
  return courseIds
    .flatMap((id) => {
      const course = courses.find((item) => item.id === id);
      return course ? [course] : [];
    })
    .slice(0, COC_MAX_COURSES);
}

export function buildCocSets(courseIds: readonly string[]): CocSet[] {
  const count = cocCourses(courseIds).length;
  if (count === 0) return [];

  return Array.from({ length: COC_SET_COUNT }, (_, index): CocSet => {
    const number = index + 1;
    return {
      id: `coc~${number}`,
      number,
      title: { en: `COC Set ${number}`, am: `COC ስብስብ ${number}` },
      questionCount: count * QUESTIONS_PER_COC_COURSE,
      courseCount: count,
      minutes: COC_MINUTES,
      isFree: number === 1,
    };
  });
}

export function buildCocQuestions(setId: string, courseIds: readonly string[]): Question[] {
  const number = Number(setId.split('~')[1] ?? 1);

  return cocCourses(courseIds).flatMap((course) => {
    const chapter = buildChapters(course)[(number - 1) % 9];
    return chapter ? buildQuestions(chapter).slice(0, QUESTIONS_PER_COC_COURSE) : [];
  });
}

export function courseTitles(courseIds: readonly string[]): Record<string, string> {
  return Object.fromEntries(cocCourses(courseIds).map((course) => [course.id, course.title]));
}
