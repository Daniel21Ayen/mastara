// packages/domain/src/constants/academic.ts
export const STREAMS = ['NATURAL', 'SOCIAL', 'COMMON'] as const;
export type Stream = (typeof STREAMS)[number];

/** Streams a student can choose; COMMON courses belong to both. */
export const STUDENT_STREAMS = ['NATURAL', 'SOCIAL'] as const;
export type StudentStream = (typeof STUDENT_STREAMS)[number];

export const EXAM_KINDS = ['MID', 'FINAL', 'MOCK'] as const;
export type ExamKind = (typeof EXAM_KINDS)[number];

export const QUIZ_NUMBERS = [1, 2, 3] as const;
export type QuizNumber = (typeof QUIZ_NUMBERS)[number];
