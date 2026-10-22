// apps/admin-web/src/modules/tests/screens/QuestionEditorScreen.tsx
'use client';

import { questionInputSchema } from '@mastara/contracts';
import type { AdminQuestion } from '@mastara/contracts';
import {
  BLANK_MARKER,
  QUESTION_FORMS,
  QUESTION_PROMPT_MAX,
  QUIZ_NUMBERS,
  questionProblems,
  quizSlug,
} from '@mastara/domain';
import type { CatalogStatus, QuestionProblem, QuizNumber } from '@mastara/domain';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { adminText, errorText } from '@/core/i18n';
import {
  CourseGate,
  CoursePicker,
  TopicFormDialog,
  useContentCourse,
  useModules,
} from '@/modules/content';
import { fieldErrors, reasonProblem } from '@/shared/forms';
import {
  Button,
  Card,
  Icon,
  PageHeader,
  RadioGroup,
  SelectField,
  StateMessage,
  TextArea,
  TextField,
} from '@/shared/ui';

import { testsApi } from '../api/tests.api';
import { MathInputHelper } from '@/shared/math';
import { AnswerList } from '../components/AnswerList';
import { OptionsEditor } from '../components/OptionsEditor';
import { QuestionPreviewDialog } from '../components/QuestionPreviewDialog';
import { TopicTree } from '../components/TopicTree';
import { emptyForm, formFromQuestion, toInput } from '../lib/questionForm';
import type { QuestionFormState } from '../lib/questionForm';
import { useQuestion } from '../hooks/useTests';

import styles from '../components/Editor.module.css';

type Field = 'topicId' | 'title' | 'prompt' | 'options' | 'correct' | 'answers' | 'reason' | 'explanation';

const PROBLEM_FIELD: Record<QuestionProblem, Field> = {
  prompt: 'prompt',
  options: 'options',
  correct: 'correct',
  answers: 'answers',
  blank: 'prompt',
};

interface BodyProps {
  courseId: string;
  courseTitle: string;
  /** The first quiz when adding a question. */
  quizNo: QuizNumber;
  /** The question to edit. Leave out to add a new one. */
  question?: AdminQuestion;
}

function EditorBody({ courseId, courseTitle, quizNo, question }: BodyProps) {
  const router = useRouter();
  const modules = useModules(courseId);
  const [saved, setSaved] = useState<AdminQuestion | undefined>(question);
  const [state, setState] = useState<QuestionFormState>(
    question ? formFromQuestion(question) : emptyForm(quizNo),
  );
  const [reason, setReason] = useState('');
  const [askReason, setAskReason] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [addingTopic, setAddingTopic] = useState(false);

  const editing = saved !== undefined;
  const listQuiz = saved?.quizNo ?? quizNo;
  const wasPublished = saved?.status === 'PUBLISHED';

  const patch = (change: Partial<QuestionFormState>, ...clear: Field[]) => {
    setState((current) => ({ ...current, ...change }));
    if (clear.length > 0) {
      setErrors((current) => {
        const next = { ...current };
        for (const field of clear) next[field] = undefined;
        return next;
      });
    }
  };

  async function save(status: CatalogStatus) {
    if (busy) return;
    setFailure(null);
    setNotice(null);

    const needsReason = wasPublished && status === 'DRAFT';
    if (needsReason) setAskReason(true);
    const effectiveTitle =
      state.prompt.trim().slice(0, 80) || state.title?.trim() || 'Question';
    const formStateWithTitle = { ...state, title: effectiveTitle };
    const parsed = questionInputSchema.safeParse(
      toInput(courseId, formStateWithTitle, status, needsReason ? reason : undefined),
    );
    const next: Partial<Record<Field, string>> = parsed.success
      ? {}
      : fieldErrors<Field>(parsed.error.issues);
    if (next.title && !next.prompt) {
      next.prompt = next.title;
    }
    if (status === 'PUBLISHED') {
      for (const problem of questionProblems(formStateWithTitle)) {
        const field = PROBLEM_FIELD[problem];
        if (!next[field]) next[field] = adminText(`admin.tests.problem.${problem}`);
      }
    }
    const reasonError = reasonProblem(needsReason, reason);
    if (reasonError) next.reason = reasonError;
    if (!parsed.success || Object.keys(next).length > 0) {
      setErrors(next);
      return;
    }

    setErrors({});
    setBusy(true);
    try {
      const result = saved
        ? await testsApi.updateQuestion(saved.id, parsed.data)
        : await testsApi.createQuestion(parsed.data);
      setNotice(
        adminText(
          status === 'PUBLISHED' ? 'admin.tests.editor.published' : 'admin.tests.editor.savedDraft',
          { id: result.id },
        ),
      );
      if (saved) {
        setSaved(result);
        setState(formFromQuestion(result));
        setAskReason(false);
        setReason('');
      } else {
        // Ready for the next question: same quiz, topic and type.
        setState(emptyForm(state.quizNo, { topicId: state.topicId, form: state.form }));
      }
    } catch (cause) {
      setFailure(errorText(cause));
    }
    setBusy(false);
  }

  function reset() {
    setState(saved ? formFromQuestion(saved) : emptyForm(quizNo));
    setErrors({});
    setFailure(null);
    setAskReason(false);
    setReason('');
  }

  const chapterOptions =
    modules.data && modules.data.length > 0
      ? modules.data.map((module, idx) => ({
          value: module.topics[0]?.id || module.id,
          label: `Chapter ${module.number || idx + 1}: ${module.title?.en || 'Foundations'}`,
        }))
      : [
          { value: 'top-1', label: 'Chapter 1: Introduction & Foundations' },
          { value: 'top-2', label: 'Chapter 2: Core Concepts & Principles' },
          { value: 'top-3', label: 'Chapter 3: Advanced Topics & Analysis' },
          { value: 'top-4', label: 'Chapter 4: Case Studies & Applications' },
          { value: 'top-5', label: 'Chapter 5: Review & Syntheses' },
        ];

  useEffect(() => {
    if (!state.topicId && chapterOptions.length > 0 && chapterOptions[0]?.value) {
      patch({ topicId: chapterOptions[0].value }, 'topicId');
    }
  }, [chapterOptions, state.topicId]);

  return (
    <>
      <Link className={styles.back} href={`/content/tests/${quizSlug(listQuiz)}`}>
        <Icon name="arrowLeft" size={18} />
        {adminText('admin.tests.editor.back')}
      </Link>
      <PageHeader
        title={adminText(editing ? 'admin.tests.editor.titleEdit' : 'admin.tests.editor.titleNew')}
        subtitle={saved ? `${saved.id} · ${saved.courseCode}` : undefined}
        actions={
          <div className={styles.headerActions}>
            <CoursePicker />
            <Button variant="outline" onClick={() => setPreviewing(true)}>
              <Icon name="eye" size={18} />
              {adminText('admin.content.reviewAsStudent')}
            </Button>
            <Button variant="outline" disabled={busy} onClick={() => void save('DRAFT')}>
              {adminText('admin.tests.editor.saveDraft')}
            </Button>
            <Button disabled={busy} onClick={() => void save('PUBLISHED')}>
              {adminText(wasPublished ? 'admin.tests.editor.update' : 'admin.tests.editor.publish')}
            </Button>
          </div>
        }
      />

      {notice ? (
        <div className={styles.notice}>
          <StateMessage>{notice}</StateMessage>
        </div>
      ) : null}

      <div className={styles.quizzes} role="group" aria-label={adminText('admin.tests.quizzes')}>
        {QUIZ_NUMBERS.map((value) => (
          <Button
            key={value}
            variant={state.quizNo === value ? 'primary' : 'outline'}
            aria-pressed={state.quizNo === value}
            onClick={() => patch({ quizNo: value })}
          >
            {adminText(`admin.nav.quiz${value}`)}
          </Button>
        ))}
      </div>

      <div className={styles.layout}>
        <TopicTree
          courseTitle={courseTitle}
          modules={modules.data ?? []}
          topicId={state.topicId}
          onPick={(topicId) => patch({ topicId }, 'topicId')}
          onNewTopic={() => setAddingTopic(true)}
        />

        <Card>
          <div className={styles.form}>
            <SelectField
              label="Chapter"
              placeholder="Select chapter"
              options={chapterOptions}
              value={state.topicId}
              onChange={(event) => patch({ topicId: event.target.value }, 'topicId')}
              error={errors.topicId}
            />
            <RadioGroup
              inline
              legend={adminText('admin.tests.questionType')}
              options={QUESTION_FORMS.map((value) => ({
                value,
                label: adminText(`admin.tests.type.${value}`),
              }))}
              value={state.form}
              onChange={(form) => patch({ form }, 'options', 'correct', 'answers')}
            />
            <div>
              <TextArea
                label="Question"
                rows={5}
                placeholder="Enter question text here..."
                maxLength={QUESTION_PROMPT_MAX}
                value={state.prompt}
                onChange={(event) => {
                  const val = event.target.value;
                  patch(
                    {
                      prompt: val,
                      title: val.trim().slice(0, 80) || 'Question',
                    },
                    'prompt',
                    'title',
                  );
                }}
                error={errors.prompt || errors.title}
              />
              <MathInputHelper
                value={state.prompt}
                onChange={(val: string) =>
                  patch(
                    {
                      prompt: val,
                      title: val.trim().slice(0, 80) || 'Question',
                    },
                    'prompt',
                    'title',
                  )
                }
                placeholderHelp="Inline $E = mc^2$ and block $$\frac{-b \pm \sqrt{b^2 - 4ac}}{2a}$$"
              />
              <p className={styles.counter}>
                {state.prompt.length}/{QUESTION_PROMPT_MAX}
              </p>
              <p className={styles.hint}>
                {adminText(
                  state.form === 'BLANK_SPACE'
                    ? 'admin.tests.blankHint'
                    : 'admin.tests.formulaHint',
                  { marker: BLANK_MARKER },
                )}
              </p>
            </div>

            {state.form === 'MULTIPLE_CHOICE' ? (
              <OptionsEditor
                options={state.options}
                correctOption={state.correctOption}
                optionsError={errors.options}
                correctError={errors.correct}
                onChange={(options, correctOption) =>
                  patch({ options, correctOption }, 'options', 'correct')
                }
              />
            ) : null}
            {state.form === 'TRUE_FALSE' ? (
              <RadioGroup
                inline
                legend={adminText('admin.tests.correctAnswer')}
                options={[
                  { value: 'true', label: adminText('admin.tests.true') },
                  { value: 'false', label: adminText('admin.tests.false') },
                ]}
                value={state.trueIsCorrect === null ? null : state.trueIsCorrect ? 'true' : 'false'}
                onChange={(value) => patch({ trueIsCorrect: value === 'true' }, 'correct')}
                error={errors.correct}
              />
            ) : null}
            {state.form === 'MULTIPLE_CHOICE' || state.form === 'TRUE_FALSE' ? (
              <div>
                <TextArea
                  label="Answer explanation"
                  rows={3}
                  placeholder="Explain why this answer is correct..."
                  value={state.explanation || ''}
                  onChange={(event) => patch({ explanation: event.target.value }, 'explanation')}
                />
                <MathInputHelper
                  value={state.explanation || ''}
                  onChange={(val: string) => patch({ explanation: val }, 'explanation')}
                  placeholderHelp="LaTeX symbols for explanation"
                />
                <p className={styles.hint}>
                  This explanation will be shown to students after they answer the question.
                </p>
              </div>
            ) : null}
            {state.form === 'SHORT_ANSWER' || state.form === 'BLANK_SPACE' ? (
              <AnswerList
                answers={state.acceptedAnswers}
                error={errors.answers}
                onChange={(acceptedAnswers) => patch({ acceptedAnswers }, 'answers')}
              />
            ) : null}

            {askReason ? (
              <TextArea
                label={adminText('admin.catalog.form.unpublishReason')}
                value={reason}
                onChange={(event) => {
                  setReason(event.target.value);
                  setErrors((current) => ({ ...current, reason: undefined }));
                }}
                error={errors.reason}
              />
            ) : null}

            {failure ? (
              <p className={styles.failure} role="alert">
                {failure}
              </p>
            ) : null}

            <div className={styles.footer}>
              <Button variant="outline" disabled={busy} onClick={reset}>
                {adminText('admin.tests.editor.reset')}
              </Button>
              {saved ? (
                <Button
                  variant="outline"
                  disabled={busy || saved.nextId === null}
                  onClick={() =>
                    saved.nextId &&
                    router.push(`/content/tests/${quizSlug(saved.quizNo)}/${saved.nextId}`)
                  }
                >
                  {adminText('admin.tests.editor.next')}
                </Button>
              ) : null}
              <Button disabled={busy} onClick={() => void save(saved ? saved.status : 'DRAFT')}>
                {busy
                  ? adminText('admin.common.saving')
                  : adminText(saved ? 'admin.tests.editor.saveChanges' : 'admin.tests.editor.add')}
              </Button>
            </div>
          </div>
        </Card>
      </div>

      {previewing ? (
        <QuestionPreviewDialog question={state} onClose={() => setPreviewing(false)} />
      ) : null}
      {addingTopic && modules.data ? (
        <TopicFormDialog
          chapterMode
          courseId={courseId}
          modules={modules.data}
          onSaved={(message) => {
            setNotice(message);
            modules.reload();
          }}
          onClose={() => setAddingTopic(false)}
        />
      ) : null}
    </>
  );
}

/** Opens a saved question in the course it belongs to; picking another course leaves for the list. */
function EditQuestion({ quizNo, questionId }: { quizNo: QuizNumber; questionId: string }) {
  const router = useRouter();
  const { data, error, reload } = useQuestion(questionId);
  const { course, setCourseId } = useContentCourse();
  const synced = useRef(false);

  useEffect(() => {
    if (!data || !course) return;
    if (course.id === data.courseId) {
      synced.current = true;
    } else if (synced.current) {
      router.push(`/content/tests/${quizSlug(data.quizNo)}`);
    } else {
      setCourseId(data.courseId);
    }
  }, [data, course, router, setCourseId]);

  if (error) {
    return (
      <StateMessage tone="alert">
        <span>{errorText(error)}</span>
        <Button variant="outline" onClick={reload}>
          {adminText('admin.common.retry')}
        </Button>
      </StateMessage>
    );
  }
  if (!data) return <StateMessage>{adminText('admin.common.loading')}</StateMessage>;
  return (
    <EditorBody
      key={data.id}
      courseId={data.courseId}
      courseTitle={data.courseTitle}
      quizNo={quizNo}
      question={data}
    />
  );
}

/** Create / Edit Question. `questionId` is left out for a new question. */
export function QuestionEditorScreen({
  quizNo,
  questionId,
}: {
  quizNo: QuizNumber;
  questionId?: string;
}) {
  if (questionId) return <EditQuestion quizNo={quizNo} questionId={questionId} />;
  return (
    <CourseGate>
      {(course) => <EditorBody courseId={course.id} courseTitle={course.title} quizNo={quizNo} />}
    </CourseGate>
  );
}
