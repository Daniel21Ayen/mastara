// apps/admin-web/src/modules/questions/screens/QuestionFormScreen.tsx
'use client';

import { examQuestionInputSchema, examSetInputSchema, ANSWER_DESCRIPTION_MAX } from '@mastara/contracts';
import type { ExamQuestionInput, ExamSet } from '@mastara/contracts';
import {
  BLANK_MARKER,
  EXAM_PROMPT_MAX,
  needsCourse,
  needsTopic,
  QUESTION_FORMS,
  questionProblems,
  examSetSlug,
  SET_YEARS,
  SET_YEAR_DEFAULT,
  STREAMS,
} from '@mastara/domain';
import type { CatalogStatus, ExamSetKind, QuestionProblem, Stream } from '@mastara/domain';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { adminText, errorText } from '@/core/i18n';
import { catalogApi } from '@/modules/catalog/api/catalog.api';
import { programsOf, usePrograms, useScanCourses, useUniversities } from '@/modules/scans';
import { AnswerList, OptionsEditor, QuestionPreviewDialog } from '@/modules/tests';
import { fieldErrors, reasonProblem } from '@/shared/forms';
import { useAsync } from '@/shared/hooks';
import {
  Badge,
  Button,
  Card,
  CardTitle,
  Icon,
  PageHeader,
  RadioGroup,
  SelectField,
  StateMessage,
  TextArea,
  TextField,
} from '@/shared/ui';

import { questionsApi } from '../api/questions.api';
import { yearText } from '../components/SetFields';
import type { SetErrors } from '../components/SetFields';
import { SetTabs } from '../components/SetTabs';
import { useExamSet } from '../hooks/useExamSets';
import {
  detailsFromSet,
  emptyDetails,
  emptyQuestion,
  isBlankQuestion,
  previewOf,
  questionFromExisting,
  toSetInput,
} from '../lib/examSetForm';
import type { SetDetailsState } from '../lib/examSetForm';

import styles from '../components/Questions.module.css';

type QuestionField = 'id' | 'topic' | 'prompt' | 'options' | 'correct' | 'answers' | 'description';

const PROBLEM_FIELD: Record<QuestionProblem, QuestionField> = {
  prompt: 'prompt',
  options: 'options',
  correct: 'correct',
  answers: 'answers',
  blank: 'prompt',
};

interface BodyProps {
  kind: ExamSetKind;
  /** The set being edited; leave out to start a new one. */
  set?: ExamSet;
}

function FormBody({ kind, set }: BodyProps) {
  const router = useRouter();
  const slug = examSetSlug(kind);
  const [details, setDetails] = useState<SetDetailsState>(set ? detailsFromSet(set) : emptyDetails());
  const [staged, setStaged] = useState<ExamQuestionInput[]>(
    set ? set.questions.map(questionFromExisting) : [],
  );
  const [current, setCurrent] = useState<ExamQuestionInput>(emptyQuestion());
  const [editing, setEditing] = useState<number | null>(null);
  const [errors, setErrors] = useState<SetErrors>({});
  const [qErrors, setQErrors] = useState<Partial<Record<QuestionField, string>>>({});
  const [reason, setReason] = useState('');
  const [askReason, setAskReason] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [previewing, setPreviewing] = useState<ExamQuestionInput | null>(null);

  const wasPublished = set?.status === 'PUBLISHED';
  const topicNeeded = needsTopic(kind);

  const universities = useUniversities();
  const programs = usePrograms();
  const courses = useScanCourses(details.programId, details.semester, details.stream);

  const isMock = kind === 'MOCK';
  const hasCourse = needsCourse(kind);
  const isMidOrFinal = kind === 'MID' || kind === 'FINAL';

  const allCatalogCourses = useAsync(() => catalogApi.listCourses({}), []);
  const selectedMidFinalCourse = (allCatalogCourses.data?.items ?? []).find(
    (c) => c.id === details.courseId,
  );

  const programOptions = isMock
    ? (programs.data ?? []).map((p) => ({ value: p.id, label: p.name }))
    : programsOf(programs.data ?? [], details.universityId).map((p) => ({
        value: p.id,
        label: p.name,
      }));

  const changeDetails = (patch: Partial<SetDetailsState>, ...clear: string[]) => {
    setDetails((value) => ({ ...value, ...patch }));
    setErrors((value) => {
      const next = { ...value };
      for (const key of clear) next[key] = undefined;
      return next;
    });
  };

  const handleSelectMidFinalCourse = (selectedCourseId: string) => {
    const chosen = (allCatalogCourses.data?.items ?? []).find((c) => c.id === selectedCourseId);
    if (chosen) {
      changeDetails(
        {
          courseId: chosen.id,
          universityId: chosen.universityId,
          programId: chosen.programId ?? 'aastu-se',
          semester: String(chosen.semesterNumber) as '1' | '2',
          stream: chosen.stream,
        },
        'courseId',
        'universityId',
        'programId',
        'semesterNumber',
        'stream',
      );
    } else {
      changeDetails({ courseId: selectedCourseId }, 'courseId');
    }
  };
  const patchQ = (patch: Partial<ExamQuestionInput>, ...clear: QuestionField[]) => {
    setCurrent((value) => ({ ...value, ...patch }));
    setQErrors((value) => {
      const next = { ...value };
      for (const field of clear) next[field] = undefined;
      return next;
    });
  };


  /** Checks the question being typed and returns the list with it added, or null when it has problems. */
  async function stageCurrent(): Promise<ExamQuestionInput[] | null> {
    const parsed = examQuestionInputSchema.safeParse(current);
    const next: Partial<Record<QuestionField, string>> = parsed.success
      ? {}
      : fieldErrors<QuestionField>(parsed.error.issues);
    for (const problem of questionProblems(current)) {
      const field = PROBLEM_FIELD[problem];
      if (!next[field]) next[field] = adminText(`admin.tests.problem.${problem}`);
    }
    if (topicNeeded && current.topic.trim() === '') {
      next.topic = adminText('admin.questions.problem.topic');
    }
    const id = current.id.trim().toLowerCase();
    if (!next.id && id !== '') {
      if (staged.some((item, index) => index !== editing && item.id.toLowerCase() === id)) {
        next.id = adminText('admin.questions.problem.idTwice');
      } else {
        const owner = await questionsApi.questionOwner(current.id);
        if (owner && owner.toLowerCase() !== details.id.trim().toLowerCase()) {
          next.id = adminText('admin.questions.problem.idUsed', { set: owner });
        }
      }
    }
    if (!parsed.success || Object.keys(next).length > 0) {
      setQErrors(next);
      return null;
    }
    setQErrors({});
    const list =
      editing === null
        ? [...staged, parsed.data]
        : staged.map((item, index) => (index === editing ? parsed.data : item));
    setStaged(list);
    setEditing(null);
    setCurrent(emptyQuestion(current.form));
    setErrors((value) => ({ ...value, questions: undefined }));
    return list;
  }

  async function save(status: CatalogStatus) {
    if (busy) return;
    setFailure(null);
    setBusy(true);
    let list: ExamQuestionInput[] | null = staged;
    if (!isBlankQuestion(current)) list = await stageCurrent();
    if (list === null) {
      setBusy(false);
      return;
    }

    const needsReason = wasPublished && status === 'DRAFT';
    if (needsReason) setAskReason(true);
    const setId =
      details.id.trim() ||
      (current.id.trim() ? `SET-${current.id.trim()}` : '') ||
      (staged[0]?.id ? `SET-${staged[0].id}` : `SET-${Date.now()}`);
    const saveDetails: SetDetailsState = {
      ...details,
      id: setId,
      year: isMock ? details.year || String(SET_YEAR_DEFAULT) : details.year,
    };
    const parsed = examSetInputSchema.safeParse(
      toSetInput(kind, saveDetails, list, status, needsReason ? reason : undefined),
    );
    const next: SetErrors = parsed.success ? {} : fieldErrors<string>(parsed.error.issues);
    if (status === 'PUBLISHED') {
      if (list.length === 0) next.questions = adminText('admin.questions.setProblem.empty');
      else if (list.some((item) => questionProblems(item).length > 0)) {
        next.questions = adminText('admin.questions.setProblem.incomplete');
      } else if (topicNeeded && list.some((item) => item.topic.trim() === '')) {
        next.questions = adminText('admin.questions.setProblem.topic');
      }
    }
    const reasonError = reasonProblem(needsReason, reason);
    if (reasonError) next.reason = reasonError;
    if (!parsed.success || Object.keys(next).length > 0) {
      setErrors(next);
      setBusy(false);
      return;
    }

    setErrors({});
    try {
      await questionsApi.saveSet(parsed.data);
      router.push(`/questions/${slug}`);
    } catch (cause) {
      setFailure(errorText(cause));
      setBusy(false);
    }
  }

  function reset() {
    setDetails(set ? detailsFromSet(set) : emptyDetails());
    setStaged(set ? set.questions.map(questionFromExisting) : []);
    setCurrent(emptyQuestion());
    setEditing(null);
    setErrors({});
    setQErrors({});
    setFailure(null);
    setAskReason(false);
    setReason('');
  }

  const kindName = adminText(`admin.questions.kindOne.${kind}`);

  return (
    <>
      <Link className={styles.back} href={`/questions/${slug}`}>
        <Icon name="arrowLeft" size={18} />
        {adminText('admin.questions.back')}
      </Link>
      <PageHeader
        title={adminText('admin.questions.form.heading')}
        actions={
          <Button variant="outline" onClick={() => setPreviewing(current)} disabled={isBlankQuestion(current)}>
            <Icon name="eye" size={18} />
            {adminText('admin.content.reviewAsStudent')}
          </Button>
        }
      />
      <SetTabs current={kind} />

      <div className={styles.stack}>
        <Card>
          <CardTitle>
            {set
              ? adminText('admin.questions.form.editTitle', { id: set.id, kind: kindName })
              : adminText('admin.questions.form.createTitle', { kind: kindName })}
          </CardTitle>
          <div className={styles.form}>
            {/* New Question Form Header: Mid & Final Exams remove University, Program, Stream, Semester */}
            {isMidOrFinal ? (
              <>
                <div className={styles.row4}>
                  <SelectField
                    label={adminText('admin.questions.field.course')}
                    placeholder={adminText('admin.scans.field.selectCourse')}
                    options={(allCatalogCourses.data?.items ?? []).map((item) => ({
                      value: item.id,
                      label: `${item.code} · ${item.title}`,
                    }))}
                    value={details.courseId}
                    onChange={(event) => handleSelectMidFinalCourse(event.target.value)}
                    error={errors.courseId}
                  />
                  <SelectField
                    label={adminText('admin.questions.field.year')}
                    options={SET_YEARS.map((y) => ({ value: String(y), label: yearText(y) }))}
                    value={details.year}
                    onChange={(event) => changeDetails({ year: event.target.value }, 'year')}
                    error={errors.year}
                  />
                  <SelectField
                    label={adminText('admin.questions.field.questionType')}
                    options={QUESTION_FORMS.map((value) => ({
                      value,
                      label: adminText(`admin.tests.type.${value}`),
                    }))}
                    value={current.form}
                    onChange={(event) =>
                      patchQ({ form: event.target.value as ExamQuestionInput['form'] }, 'options', 'correct', 'answers')
                    }
                  />
                  <TextField
                    label={adminText('admin.questions.field.questionId')}
                    autoComplete="off"
                    placeholder={adminText('admin.questions.field.questionIdPlaceholder')}
                    value={current.id}
                    onChange={(event) => patchQ({ id: event.target.value }, 'id')}
                    error={qErrors.id}
                  />
                </div>
                {selectedMidFinalCourse && (
                  <p style={{ margin: '-4px 0 8px', fontSize: '0.8rem', color: '#64748b' }}>
                    Linked scope: <strong>{selectedMidFinalCourse.universityShortName}</strong> ·{' '}
                    <strong>{selectedMidFinalCourse.programName || 'Common Courses'}</strong> · Semester{' '}
                    {selectedMidFinalCourse.semesterNumber} · {selectedMidFinalCourse.stream}
                  </p>
                )}
              </>
            ) : (
              <>
                {/* Scope for COC and Mock Exams */}
                <div className={isMock ? styles.row3 : styles.row5}>
                  {!isMock ? (
                    <SelectField
                      label={adminText('admin.questions.field.university')}
                      placeholder={adminText('admin.scans.field.selectUniversity')}
                      options={(universities.data ?? []).map((u) => ({
                        value: u.id,
                        label: u.shortName,
                      }))}
                      value={details.universityId}
                      onChange={(event) =>
                        changeDetails(
                          { universityId: event.target.value, programId: '', courseId: '' },
                          'universityId',
                          'programId',
                        )
                      }
                      error={errors.universityId}
                    />
                  ) : null}
                  <SelectField
                    label={adminText('admin.questions.field.program')}
                    placeholder={adminText('admin.scans.field.selectProgram')}
                    options={programOptions}
                    value={details.programId}
                    disabled={!isMock && details.universityId === ''}
                    onChange={(event) => changeDetails({ programId: event.target.value, courseId: '' }, 'programId')}
                    error={errors.programId}
                  />
                  <SelectField
                    label={adminText('admin.questions.field.semester')}
                    placeholder={adminText('admin.scans.field.selectSemester')}
                    options={(['1', '2'] as const).map((value) => ({
                      value,
                      label: adminText(`admin.questions.semester.${value}`),
                    }))}
                    value={details.semester}
                    onChange={(event) =>
                      changeDetails(
                        { semester: event.target.value as SetDetailsState['semester'], courseId: '' },
                        'semesterNumber',
                      )
                    }
                    error={errors.semesterNumber}
                  />
                  <SelectField
                    label={adminText('admin.questions.field.stream')}
                    placeholder={adminText('admin.scans.field.selectStream')}
                    options={STREAMS.map((value) => ({
                      value,
                      label: adminText(`admin.stream.${value}`),
                    }))}
                    value={details.stream}
                    onChange={(event) =>
                      changeDetails({ stream: event.target.value as Stream | '', courseId: '' }, 'stream')
                    }
                    error={errors.stream}
                  />
                  {!isMock ? (
                    <SelectField
                      label={adminText('admin.questions.field.year')}
                      options={SET_YEARS.map((y) => ({ value: String(y), label: yearText(y) }))}
                      value={details.year}
                      onChange={(event) => changeDetails({ year: event.target.value }, 'year')}
                      error={errors.year}
                    />
                  ) : null}
                </div>

                {/* Row 2: Course (if needsCourse), Question Type, Question ID */}
                <div className={hasCourse ? styles.row3 : styles.row2}>
                  {hasCourse ? (
                    <SelectField
                      label={adminText('admin.questions.field.course')}
                      placeholder={adminText('admin.scans.field.selectCourse')}
                      options={(courses.data ?? []).map((item) => ({
                        value: item.id,
                        label: `${item.code} · ${item.title}`,
                      }))}
                      value={details.courseId}
                      disabled={(courses.data ?? []).length === 0}
                      onChange={(event) => changeDetails({ courseId: event.target.value }, 'courseId')}
                      error={errors.courseId}
                    />
                  ) : null}
                  <SelectField
                    label={adminText('admin.questions.field.questionType')}
                    options={QUESTION_FORMS.map((value) => ({
                      value,
                      label: adminText(`admin.tests.type.${value}`),
                    }))}
                    value={current.form}
                    onChange={(event) =>
                      patchQ({ form: event.target.value as ExamQuestionInput['form'] }, 'options', 'correct', 'answers')
                    }
                  />
                  <TextField
                    label={adminText('admin.questions.field.questionId')}
                    autoComplete="off"
                    placeholder={adminText('admin.questions.field.questionIdPlaceholder')}
                    value={current.id}
                    onChange={(event) => patchQ({ id: event.target.value }, 'id')}
                    error={qErrors.id}
                  />
                </div>
              </>
            )}

            {/* Row 3: Question Text */}
            <div>
              <TextArea
                label={adminText('admin.questions.field.question')}
                rows={5}
                maxLength={EXAM_PROMPT_MAX}
                placeholder={adminText('admin.questions.field.questionPlaceholder')}
                value={current.prompt}
                onChange={(event) => patchQ({ prompt: event.target.value }, 'prompt')}
                error={qErrors.prompt}
              />
              <p className={styles.counter}>
                {current.prompt.length}/{EXAM_PROMPT_MAX}
              </p>
              <p className={styles.hint}>
                {isMock
                  ? 'Σ You can use mathematical formulas. Example: $^2$, ½, √a'
                  : adminText(
                      current.form === 'BLANK_SPACE' ? 'admin.tests.blankHint' : 'admin.tests.formulaHint',
                      { marker: BLANK_MARKER },
                    )}
              </p>
            </div>

            {/* Row 4 & 5: Options & Correct Answer */}
            {current.form === 'MULTIPLE_CHOICE' ? (
              <OptionsEditor
                options={current.options}
                correctOption={current.correctOption}
                optionsError={qErrors.options}
                correctError={qErrors.correct}
                onChange={(options, correctOption) =>
                  patchQ({ options, correctOption }, 'options', 'correct')
                }
              />
            ) : null}
            {current.form === 'TRUE_FALSE' ? (
              <RadioGroup
                inline
                legend={adminText('admin.tests.correctAnswer')}
                options={[
                  { value: 'true', label: adminText('admin.tests.true') },
                  { value: 'false', label: adminText('admin.tests.false') },
                ]}
                value={current.trueIsCorrect === null ? null : current.trueIsCorrect ? 'true' : 'false'}
                onChange={(value) => patchQ({ trueIsCorrect: value === 'true' }, 'correct')}
                error={qErrors.correct}
              />
            ) : null}
            {current.form === 'SHORT_ANSWER' || current.form === 'BLANK_SPACE' ? (
              <AnswerList
                answers={current.acceptedAnswers}
                error={qErrors.answers}
                onChange={(acceptedAnswers) => patchQ({ acceptedAnswers }, 'answers')}
              />
            ) : null}

            {/* Row 6: Answer Description */}
            <div>
              <TextArea
                label={adminText('admin.questions.field.answerDescription')}
                rows={3}
                maxLength={ANSWER_DESCRIPTION_MAX}
                placeholder={adminText('admin.questions.field.answerDescriptionPlaceholder')}
                value={current.answerDescription ?? ''}
                onChange={(event) => patchQ({ answerDescription: event.target.value }, 'description')}
              />
              <p className={styles.counter}>
                {(current.answerDescription ?? '').length}/{ANSWER_DESCRIPTION_MAX}
              </p>
              <p className={styles.hint}>{adminText('admin.questions.field.answerDescriptionHint')}</p>
            </div>

            {askReason ? (
              <TextArea
                label={adminText('admin.catalog.form.unpublishReason')}
                value={reason}
                onChange={(event) => {
                  setReason(event.target.value);
                  setErrors((value) => ({ ...value, reason: undefined }));
                }}
                error={errors.reason}
              />
            ) : null}
            {failure ? (
              <p className={styles.failure} role="alert">
                {failure}
              </p>
            ) : null}

            {/* Row 7: Actions Bar */}
            <div className={styles.footerBar}>
              <Button variant="outline" disabled={busy} onClick={() => void stageCurrent()}>
                <Icon name="plus" size={18} />
                {adminText(editing === null ? 'admin.questions.form.addQuestion' : 'admin.questions.form.updateQuestion')}
              </Button>
              <div className={styles.footerRight}>
                <Button variant="outline" disabled={busy} onClick={reset}>
                  {adminText('admin.questions.form.reset')}
                </Button>
                <Button variant="outline" disabled={busy} onClick={() => void save('DRAFT')}>
                  {adminText('admin.questions.form.saveDraft')}
                </Button>
                <Button disabled={busy} onClick={() => void save('PUBLISHED')}>
                  {adminText(wasPublished ? 'admin.questions.form.update' : 'admin.questions.form.publish')}
                </Button>
              </div>
            </div>
          </div>
        </Card>

        {staged.length > 0 || errors.questions ? (
          <Card>
            <CardTitle>{adminText('admin.questions.form.inSet', { n: staged.length })}</CardTitle>
            {errors.questions ? (
              <p className={styles.error} role="alert">
                {errors.questions}
              </p>
            ) : null}
            {staged.length === 0 ? (
              <p className={styles.hint}>{adminText('admin.questions.form.noneYet')}</p>
            ) : (
              <ul className={styles.staged}>
              {staged.map((question, index) => {
                const unfinished =
                  questionProblems(question).length > 0 ||
                  (topicNeeded && question.topic.trim() === '');
                return (
                  <li key={question.id} className={styles.stagedRow}>
                    <span className={styles.stagedText}>
                      <span className={styles.stagedId}>{question.id}</span>
                      <span className={styles.stagedPrompt}>
                        {adminText(`admin.tests.type.${question.form}`)} ·{' '}
                        {question.prompt || adminText('admin.questions.review.noPrompt')}
                      </span>
                    </span>
                    {unfinished ? (
                      <Badge tone="danger">{adminText('admin.questions.review.unfinished')}</Badge>
                    ) : null}
                    <Button
                      variant="outline"
                      aria-label={adminText('admin.questions.form.editNamed', { id: question.id })}
                      onClick={() => {
                        setCurrent(question);
                        setEditing(index);
                        setQErrors({});
                      }}
                    >
                      {adminText('admin.catalog.edit')}
                    </Button>
                    <Button
                      variant="outline"
                      aria-label={adminText('admin.questions.form.removeNamed', { id: question.id })}
                      onClick={() => {
                        setStaged(staged.filter((_, i) => i !== index));
                        if (editing === index) {
                          setEditing(null);
                          setCurrent(emptyQuestion(current.form));
                        }
                      }}
                    >
                      {adminText('admin.questions.form.remove')}
                    </Button>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
        ) : null}
      </div>

      {previewing ? (
        <QuestionPreviewDialog question={previewOf(previewing)} onClose={() => setPreviewing(null)} />
      ) : null}
    </>
  );
}

/** New question / Edit set: the set's details, the question being typed, and the questions added so far. */
export function QuestionFormScreen({ kind, setId }: { kind: ExamSetKind; setId?: string }) {
  const { data, error, loading, reload } = useExamSet(setId ?? null);
  if (setId) {
    if (error) {
      return (
        <StateMessage tone="alert">
          <span>{adminText('admin.questions.error')}</span>
          <Button variant="outline" onClick={reload}>
            {adminText('admin.common.retry')}
          </Button>
        </StateMessage>
      );
    }
    if (loading || !data) {
      return <StateMessage>{adminText('admin.common.loading')}</StateMessage>;
    }
    // The address names a set of another kind: show it under its own tab instead.
    if (data.kind !== kind) {
      return <StateMessage tone="alert">{adminText('admin.questions.problem.wrongKind')}</StateMessage>;
    }
  }
  return <FormBody key={data?.id ?? 'new'} kind={kind} set={data ?? undefined} />;
}
