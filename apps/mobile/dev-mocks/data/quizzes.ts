// apps/mobile/src/core/mock/data/quizzes.ts
import type { Course, Option, Question, QuizChapter } from '@mastara/contracts';
import type { QuizNumber } from '@mastara/domain';

import { courses } from './courses';

const CHAPTERS_PER_QUIZ = 3;
const QUESTIONS_PER_CHAPTER = 10;
const MINUTES_PER_CHAPTER = 15;
const QUIZ_NUMBERS_LIST: readonly QuizNumber[] = [1, 2, 3];

export function chapterId(courseId: string, quizNo: QuizNumber, chapterNumber: number): string {
  return `${courseId}~q${quizNo}c${chapterNumber}`;
}

/** Quiz 1 holds chapters 1-3, Quiz 2 chapters 4-6, Quiz 3 chapters 7-9. The first chapter of each quiz is free. */
export function buildChapters(course: Course): QuizChapter[] {
  return QUIZ_NUMBERS_LIST.flatMap((quizNo) =>
    Array.from({ length: CHAPTERS_PER_QUIZ }, (_, index): QuizChapter => {
      const chapterNumber = (quizNo - 1) * CHAPTERS_PER_QUIZ + index + 1;
      return {
        id: chapterId(course.id, quizNo, chapterNumber),
        courseId: course.id,
        quizNo,
        chapterNumber,
        title: { en: `Chapter ${chapterNumber}`, am: `ምዕራፍ ${chapterNumber}` },
        questionCount: QUESTIONS_PER_CHAPTER,
        minutes: MINUTES_PER_CHAPTER,
        isFree: index === 0,
      };
    }),
  );
}

export function findChapter(id: string): QuizChapter | null {
  const course = courses.find((item) => item.id === id.split('~')[0]);
  return course ? (buildChapters(course).find((chapter) => chapter.id === id) ?? null) : null;
}

// ---- deterministic question generator (mock only) ----

function hash(value: string): number {
  let result = 0;
  for (const char of value) result = (result * 31 + char.charCodeAt(0)) >>> 0;
  return result;
}

function random(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 2 ** 32;
  };
}

const between = (next: () => number, min: number, max: number) => min + Math.floor(next() * (max - min + 1));
const same = (value: string) => ({ en: value, am: value });
const TRUE_FALSE: Option[] = [
  { id: 'true', label: { en: 'True', am: 'እውነት' } },
  { id: 'false', label: { en: 'False', am: 'ሐሰት' } },
];
const KINDS = ['SINGLE', 'SINGLE', 'TF', 'MULTIPLE', 'SHORT', 'SINGLE', 'TF', 'MULTIPLE', 'SHORT', 'SINGLE'] as const;

export function buildQuestions(chapter: QuizChapter): Question[] {
  const course = courses.find((item) => item.id === chapter.courseId);
  const natural = course?.stream === 'NATURAL';
  const next = random(hash(chapter.id));

  return KINDS.map((kind, index): Question => {
    const id = `${chapter.id}:${index + 1}`;
    const courseId = chapter.courseId;

    if (kind === 'TF') {
      const a = between(next, 2, 20);
      const b = between(next, 2, 20);
      return {
        id,
        courseId,
        type: 'TRUE_FALSE',
        prompt: { en: `${a} is greater than ${b}.`, am: `${a} ከ ${b} ይበልጣል።` },
        options: TRUE_FALSE,
        correctOptionIds: [a > b ? 'true' : 'false'],
        explanation: same(`${a} ${a > b ? '>' : '≤'} ${b}`),
      };
    }

    if (kind === 'MULTIPLE') {
      const numbers = [2 * between(next, 1, 9), 2 * between(next, 1, 9) + 1, between(next, 20, 40), between(next, 41, 60)];
      const unique = [...new Set(numbers)];
      const options: Option[] = unique.map((value) => ({ id: `n${value}`, label: same(String(value)) }));
      return {
        id,
        courseId,
        type: 'MULTIPLE',
        prompt: { en: 'Select all even numbers.', am: 'ሁሉንም ጥንድ ቁጥሮች ይምረጡ።' },
        options,
        correctOptionIds: unique.filter((value) => value % 2 === 0).map((value) => `n${value}`),
      };
    }

    if (kind === 'SHORT') {
      const a = between(next, 2, 9);
      const b = between(next, 2, 9);
      return {
        id,
        courseId,
        type: 'SHORT',
        prompt: { en: `Type the result of ${a} × ${b}.`, am: `${a} × ${b} ስንት ነው? ይጻፉ።` },
        acceptedAnswers: [String(a * b)],
        explanation: same(`${a} × ${b} = ${a * b}`),
      };
    }

    // SINGLE: the last one is a formula question for natural-science courses.
    const correctSlot = index % 4;
    let prompt = { en: '', am: '' };
    let correct = 0;
    let distractors: number[] = [];

    if (natural && index === 9) {
      const k = between(next, 3, 9);
      prompt = {
        en: `What is the value of $x^2$ when $x=${k}$?`,
        am: `$x=${k}$ ሲሆን የ $x^2$ ዋጋ ስንት ነው?`,
      };
      correct = k * k;
      distractors = [2 * k, k + 2, k * k + 1];
    } else {
      const a = between(next, 2, 20);
      const b = between(next, 2, 20);
      prompt = { en: `What is ${a} + ${b}?`, am: `${a} + ${b} ስንት ነው?` };
      correct = a + b;
      distractors = [correct + 1, correct - 1, correct + 10];
    }

    const values = [...distractors];
    values.splice(correctSlot, 0, correct);
    return {
      id,
      courseId,
      type: 'SINGLE',
      prompt,
      options: values.map((value, position) => ({ id: `o${position}`, label: same(String(value)) })),
      correctOptionIds: [`o${correctSlot}`],
      explanation: same(natural && index === 9 ? `$x^2 = ${correct}$` : `= ${correct}`),
    };
  });
}
