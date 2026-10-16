// apps/admin-web/src/modules/scans/lib/scanForm.ts
import type { ScanFile } from '@mastara/contracts';
import { scanFileProblem } from '@mastara/domain';
import type {
  ExamKind,
  QuestionForm,
  QuizNumber,
  ScanKind,
  ScanMaterialKind,
  Stream,
} from '@mastara/domain';

/** A scanned page (or attached file) as the form holds it; images also keep a preview address. */
export interface PageItem {
  key: string;
  file: ScanFile;
  url: string | null;
}

export interface AnswerItem {
  key: string;
  questionId: string;
  questionType: QuestionForm | '';
  text: string;
  file: PageItem | null;
}

export interface ScanFormState {
  kind: ScanKind;
  examKind: ExamKind;
  materialKind: ScanMaterialKind;
  quizNo: QuizNumber;
  examSetId: string;
  universityId: string;
  programId: string;
  semester: '' | '1' | '2';
  stream: Stream | '';
  courseId: string;
  topicId: string;
  title: string;
  description: string;
  year: string;
  answers: AnswerItem[];
}

let counter = 0;
export const nextKey = (): string => `k${(counter += 1)}`;

export const emptyAnswer = (): AnswerItem => ({
  key: nextKey(),
  questionId: '',
  questionType: '',
  text: '',
  file: null,
});

export const emptyScanForm = (kind: ScanKind = 'COC'): ScanFormState => ({
  kind,
  examKind: 'MID',
  materialKind: 'MODULE',
  quizNo: 1,
  examSetId: '',
  universityId: '',
  programId: '',
  semester: '',
  stream: '',
  courseId: '',
  topicId: '',
  title: '',
  description: '',
  year: '',
  answers: [emptyAnswer()],
});

/** Which parts of the form each kind of scan uses. */
export function partsOf(kind: ScanKind) {
  return {
    examSet: kind !== 'COC',
    scope: kind !== 'COC',
    year: kind === 'COC',
    topic: kind === 'MATERIAL' || kind === 'QUIZ',
    textFields: kind === 'MATERIAL' || kind === 'QUIZ',
    answers: kind !== 'MATERIAL',
    questionType: kind === 'EXAM',
  };
}

/** Wraps a browser file as a form item, or says why it cannot be used. */
export function toItem(
  file: File,
): { item: PageItem } | { problem: 'type' | 'size'; name: string } {
  const problem = scanFileProblem(file.type, file.size);
  if (problem) return { problem, name: file.name };
  const preview = file.type.startsWith('image/') ? URL.createObjectURL(file) : null;
  return {
    item: {
      key: nextKey(),
      file: { name: file.name, mime: file.type as ScanFile['mime'], sizeBytes: file.size },
      url: preview,
    },
  };
}

/** The payload for the chosen kind, to be checked by `scanInputSchema`. Unused fields are left out. */
export function toScanInput(state: ScanFormState, pages: readonly PageItem[]): unknown {
  const common = { pages: pages.map((page) => page.file) };
  const scope = {
    examSetId: state.examSetId,
    universityId: state.universityId,
    programId: state.programId,
    semesterNumber: state.semester === '' ? undefined : Number(state.semester),
    stream: state.stream === '' ? undefined : state.stream,
    courseId: state.courseId,
  };
  const answers = state.answers.map((answer) => ({
    questionId: answer.questionId,
    text: answer.text,
    file: answer.file?.file ?? null,
  }));
  switch (state.kind) {
    case 'COC':
      return {
        kind: 'COC',
        ...common,
        universityId: state.universityId,
        programId: state.programId,
        year: state.year.trim() === '' ? undefined : Number(state.year),
        answers,
      };
    case 'EXAM':
      return {
        kind: 'EXAM',
        ...common,
        ...scope,
        examKind: state.examKind,
        answers: answers.map((answer, index) => ({
          ...answer,
          questionType: state.answers[index]?.questionType || undefined,
        })),
      };
    case 'MATERIAL':
      return {
        kind: 'MATERIAL',
        ...common,
        ...scope,
        materialKind: state.materialKind,
        topicId: state.topicId,
        title: state.title,
        description: state.description,
      };
    default:
      return {
        kind: 'QUIZ',
        ...common,
        ...scope,
        quizNo: state.quizNo,
        topicId: state.topicId,
        title: state.title,
        description: state.description,
        answers,
      };
  }
}
