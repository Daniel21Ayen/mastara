// packages/domain/src/assessment/questionRules.ts
import { BLANK_MARKER } from '../constants/admin';
import type { QuestionForm } from '../constants/admin';
import type { QuestionType } from '../constants/assessment';
import type { QuizNumber } from '../constants/academic';

/** What the editor knows about a question, whatever its type. Only the fields of the chosen type count. */
export interface QuestionDraft {
  form: QuestionForm;
  prompt: string;
  options: readonly string[];
  /** Index into `options`, or null while nothing is chosen. */
  correctOption: number | null;
  /** For True / False: whether "True" is the right answer, or null while nothing is chosen. */
  trueIsCorrect: boolean | null;
  acceptedAnswers: readonly string[];
}

/** What still blocks publishing, in the order the editor shows it. */
export type QuestionProblem = 'prompt' | 'options' | 'correct' | 'answers' | 'blank';

const filled = (values: readonly string[]): string[] =>
  values.map((value) => value.trim()).filter((value) => value !== '');

export function questionProblems(question: QuestionDraft): QuestionProblem[] {
  const problems: QuestionProblem[] = [];
  if (!question.prompt.trim()) problems.push('prompt');

  switch (question.form) {
    case 'MULTIPLE_CHOICE': {
      const options = filled(question.options);
      const distinct = new Set(options.map((option) => option.toLowerCase()));
      if (options.length < 2 || distinct.size !== options.length) problems.push('options');
      const chosen =
        question.correctOption === null ? undefined : question.options[question.correctOption];
      if (chosen === undefined || chosen.trim() === '') problems.push('correct');
      break;
    }
    case 'TRUE_FALSE':
      if (question.trueIsCorrect === null) problems.push('correct');
      break;
    case 'BLANK_SPACE':
      if (question.prompt.trim() && !question.prompt.includes(BLANK_MARKER)) problems.push('blank');
      if (filled(question.acceptedAnswers).length === 0) problems.push('answers');
      break;
    case 'SHORT_ANSWER':
      if (filled(question.acceptedAnswers).length === 0) problems.push('answers');
      break;
  }
  return problems;
}

/** The type the student app uses. It has no separate fill-in-the-blank type. */
export function toStudentType(
  form: QuestionForm,
): Extract<QuestionType, 'SINGLE' | 'TRUE_FALSE' | 'SHORT'> {
  switch (form) {
    case 'MULTIPLE_CHOICE':
      return 'SINGLE';
    case 'TRUE_FALSE':
      return 'TRUE_FALSE';
    default:
      return 'SHORT';
  }
}

/** A quiz can go live once it has at least one published question. */
export function canPublishQuiz(publishedQuestions: number): boolean {
  return publishedQuestions >= 1;
}

/** "quiz-2" in addresses and the menu. */
export const quizSlug = (quizNo: QuizNumber): string => `quiz-${quizNo}`;

export function quizNoFromSlug(slug: string): QuizNumber | null {
  const match = /^quiz-([123])$/.exec(slug);
  return match ? (Number(match[1]) as QuizNumber) : null;
}
