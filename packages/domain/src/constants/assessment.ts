// packages/domain/src/constants/assessment.ts
export const QUESTION_TYPES = ['SINGLE', 'TRUE_FALSE', 'MULTIPLE', 'SHORT'] as const;
export type QuestionType = (typeof QUESTION_TYPES)[number];

/** Question types answered by picking options (as opposed to typing). */
export const CHOICE_TYPES = ['SINGLE', 'TRUE_FALSE', 'MULTIPLE'] as const;
export type ChoiceType = (typeof CHOICE_TYPES)[number];
