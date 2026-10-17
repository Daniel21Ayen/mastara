// apps/admin-web/src/modules/questions/lib/examSetForm.ts
import type { ExamQuestion, ExamQuestionInput, ExamSet, ExamSetInput } from '@mastara/contracts';
import { OPTIONS_DEFAULT, SET_MINUTES_DEFAULT, SET_YEAR_DEFAULT } from '@mastara/domain';
import type { CatalogStatus, ExamSetKind, Stream } from '@mastara/domain';

/** The set's details as the form holds them while the admin types. */
export interface SetDetailsState {
  id: string;
  universityId: string;
  programId: string;
  semester: '' | '1' | '2';
  stream: Stream | '';
  courseId: string;
  year: string;
  isFree: boolean;
  minutes: string;
}

export const emptyDetails = (): SetDetailsState => ({
  id: '',
  universityId: '',
  programId: '',
  semester: '',
  stream: '',
  courseId: '',
  year: String(SET_YEAR_DEFAULT),
  isFree: false,
  minutes: String(SET_MINUTES_DEFAULT),
});

export const detailsFromSet = (set: ExamSet): SetDetailsState => ({
  id: set.id,
  universityId: set.universityId,
  programId: set.programId,
  semester: String(set.semesterNumber) as '1' | '2',
  stream: set.stream,
  courseId: set.courseId ?? '',
  year: String(set.year),
  isFree: set.isFree,
  minutes: String(set.minutes),
});

export const emptyQuestion = (keepForm?: ExamQuestionInput['form']): ExamQuestionInput => ({
  id: '',
  form: keepForm ?? 'MULTIPLE_CHOICE',
  topic: '',
  prompt: '',
  options: Array.from({ length: OPTIONS_DEFAULT }, () => ''),
  correctOption: null,
  trueIsCorrect: null,
  acceptedAnswers: [''],
  answerDescription: '',
});

export const questionFromExisting = (question: ExamQuestion): ExamQuestionInput => ({
  ...question,
  options:
    question.options.length > 0
      ? [...question.options]
      : Array.from({ length: OPTIONS_DEFAULT }, () => ''),
  acceptedAnswers: question.acceptedAnswers.length > 0 ? [...question.acceptedAnswers] : [''],
  answerDescription: question.answerDescription ?? '',
});

/** True while nothing has been typed into the question part of the form. */
export const isBlankQuestion = (question: ExamQuestionInput): boolean =>
  question.id.trim() === '' &&
  question.prompt.trim() === '' &&
  question.topic.trim() === '' &&
  (question.answerDescription ?? '').trim() === '' &&
  question.options.every((option) => option.trim() === '') &&
  question.acceptedAnswers.every((answer) => answer.trim() === '');

/** The payload for the whole set, to be checked by `examSetInputSchema`. */
export function toSetInput(
  kind: ExamSetKind,
  details: SetDetailsState,
  questions: readonly ExamQuestionInput[],
  status: CatalogStatus,
  reason?: string,
): unknown {
  return {
    id: details.id,
    kind,
    universityId: details.universityId,
    programId: details.programId,
    semesterNumber: details.semester === '' ? undefined : Number(details.semester),
    stream: details.stream === '' ? undefined : details.stream,
    courseId: details.courseId === '' ? null : details.courseId,
    year: details.year.trim() === '' ? undefined : Number(details.year),
    isFree: details.isFree,
    minutes: details.minutes.trim() === '' ? undefined : Number(details.minutes),
    status,
    questions,
    reason,
  } satisfies Partial<Record<keyof ExamSetInput, unknown>>;
}

/** A question as the preview dialog of the Tests module expects it. */
export const previewOf = (question: ExamQuestionInput | ExamQuestion) => ({
  quizNo: 1 as const,
  topicId: '',
  title: question.id,
  form: question.form,
  prompt: question.prompt,
  options: [...question.options],
  correctOption: question.correctOption,
  trueIsCorrect: question.trueIsCorrect,
  acceptedAnswers: [...question.acceptedAnswers],
});

/** An existing set as a save payload, with a new status. Used by Verify to publish or unpublish. */
export const inputFromSet = (
  set: ExamSet,
  status: CatalogStatus,
  reason?: string,
): ExamSetInput => ({
  id: set.id,
  kind: set.kind,
  universityId: set.universityId,
  programId: set.programId,
  semesterNumber: set.semesterNumber,
  stream: set.stream,
  courseId: set.courseId,
  year: set.year,
  isFree: set.isFree,
  minutes: set.minutes,
  status,
  questions: set.questions.map((question) => ({ ...question })),
  reason,
});
