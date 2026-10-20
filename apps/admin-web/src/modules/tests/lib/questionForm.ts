// apps/admin-web/src/modules/tests/lib/questionForm.ts
import type { AdminQuestion, QuestionInput } from '@mastara/contracts';
import { OPTIONS_DEFAULT } from '@mastara/domain';
import type { QuestionForm, QuizNumber } from '@mastara/domain';

/** What the editor holds while the admin types. It becomes a `QuestionInput` on save. */
export interface QuestionFormState {
  quizNo: QuizNumber;
  topicId: string;
  title: string;
  form: QuestionForm;
  prompt: string;
  options: string[];
  correctOption: number | null;
  trueIsCorrect: boolean | null;
  acceptedAnswers: string[];
  explanation?: string;
}

export const emptyForm = (
  quizNo: QuizNumber,
  keep?: Pick<QuestionFormState, 'topicId' | 'form'>,
): QuestionFormState => ({
  quizNo,
  topicId: keep?.topicId ?? '',
  title: '',
  form: keep?.form ?? 'MULTIPLE_CHOICE',
  prompt: '',
  options: Array.from({ length: OPTIONS_DEFAULT }, () => ''),
  correctOption: null,
  trueIsCorrect: null,
  acceptedAnswers: [''],
  explanation: '',
});

export const formFromQuestion = (question: AdminQuestion): QuestionFormState => ({
  quizNo: question.quizNo,
  topicId: question.topicId,
  title: question.title,
  form: question.form,
  prompt: question.prompt,
  options:
    question.options.length > 0
      ? [...question.options]
      : Array.from({ length: OPTIONS_DEFAULT }, () => ''),
  correctOption: question.correctOption,
  trueIsCorrect: question.trueIsCorrect,
  acceptedAnswers: question.acceptedAnswers.length > 0 ? [...question.acceptedAnswers] : [''],
  explanation: question.explanation ?? '',
});

export const toInput = (
  courseId: string,
  state: QuestionFormState,
  status: QuestionInput['status'],
  reason?: string,
): QuestionInput => {
  const title = (state.title?.trim() || state.prompt?.trim() || 'Question').slice(0, 100);
  return { ...state, title, courseId, status, reason };
};
