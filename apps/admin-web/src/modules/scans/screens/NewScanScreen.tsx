// apps/admin-web/src/modules/scans/screens/NewScanScreen.tsx
'use client';

import { scanInputSchema } from '@mastara/contracts';
import {
  EXAM_KINDS,
  SCAN_DESCRIPTION_MAX,
  SCAN_KINDS,
  SCAN_MATERIAL_KINDS,
  STREAMS,
} from '@mastara/domain';
import type { ExamKind, QuizNumber, ScanKind, ScanMaterialKind, Stream } from '@mastara/domain';
import Link from 'next/link';
import { useState } from 'react';

import { adminText, adminTextFor, errorText } from '@/core/i18n';
import {
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

import { scansApi } from '../api/scans.api';
import { AnswersEditor } from '../components/AnswersEditor';
import { PagesPicker } from '../components/PagesPicker';
import {
  usePrograms,
  useScanCourses,
  useTopicOptions,
  useUniversities,
} from '../hooks/useScanOptions';
import { emptyScanForm, partsOf, toScanInput } from '../lib/scanForm';
import type { PageItem, ScanFormState } from '../lib/scanForm';

import styles from '../components/Scans.module.css';

const QUIZ_VALUES: readonly QuizNumber[] = [1, 2, 3];

/** The message for a Zod issue: our own keys as they are, anything else as "required". */
const messageOf = (message: string): string =>
  message.startsWith('validation.') ? adminTextFor(message) : adminText('validation.required');

/** "pages", "examSetId", or "0.text" for the first answer's text. */
function keyOf(path: readonly PropertyKey[]): string {
  return path[0] === 'answers' && path.length > 2
    ? `${String(path[1])}.${String(path[2])}`
    : String(path[0]);
}

/** New Scan: pages joined into one PDF, what the PDF is for, where it belongs, and its answers. */
export function NewScanScreen() {
  const [state, setState] = useState<ScanFormState>(emptyScanForm());
  const [pages, setPages] = useState<PageItem[]>([]);
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [rejected, setRejected] = useState<string[]>([]);
  const [failure, setFailure] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const universities = useUniversities();
  const programs = usePrograms();
  const courses = useScanCourses(state.programId, state.semester, state.stream);
  const topics = useTopicOptions(state.courseId);

  const parts = partsOf(state.kind);

  const patch = (change: Partial<ScanFormState>, ...clear: string[]) => {
    setState((current) => ({ ...current, ...change }));
    setErrors((current) => {
      const next = { ...current };
      for (const key of clear) next[key] = undefined;
      return next;
    });
  };
  const text = (field: keyof ScanFormState) => (event: { target: { value: string } }) =>
    patch({ [field]: event.target.value } as Partial<ScanFormState>, field);

  async function save() {
    if (busy) return;
    setFailure(null);
    setNotice(null);
    const parsed = scanInputSchema.safeParse(toScanInput(state, pages));
    if (!parsed.success) {
      const next: Record<string, string | undefined> = {};
      for (const issue of parsed.error.issues) {
        const key = keyOf(issue.path);
        if (!next[key]) next[key] = messageOf(issue.message);
      }
      setErrors(next);
      return;
    }
    setErrors({});
    setBusy(true);
    try {
      const saved = await scansApi.createScan(parsed.data);
      setNotice(adminText('admin.scans.saved', { id: saved.id }));
      setState(emptyScanForm(state.kind));
      setPages([]);
      setRejected([]);
    } catch (cause) {
      setFailure(errorText(cause));
    }
    setBusy(false);
  }

  const programOptions = (programs.data ?? [])
    .filter((program) => program.universityId === state.universityId)
    .map((program) => ({ value: program.id, label: program.name }));

  return (
    <>
      <Link className={styles.back} href="/scan-to-pdf">
        <Icon name="arrowLeft" size={18} />
        {adminText('admin.scans.back')}
      </Link>
      <PageHeader
        title={adminText('admin.scans.new.title')}
        subtitle={adminText('admin.scans.new.subtitle')}
        actions={
          <Button disabled={busy} onClick={() => void save()}>
            {busy ? adminText('admin.common.saving') : adminText('admin.scans.save')}
          </Button>
        }
      />
      {notice ? (
        <div className={styles.notice}>
          <StateMessage>{notice}</StateMessage>
        </div>
      ) : null}

      <div className={styles.stack}>
        <Card>
          <CardTitle>{adminText('admin.scans.pages.title')}</CardTitle>
          <PagesPicker
            pages={pages}
            error={errors.pages}
            onChange={(next) => {
              setPages(next);
              setErrors((current) => ({ ...current, pages: undefined }));
            }}
            onRejected={setRejected}
          />
          {rejected.map((problem) => (
            <p key={problem} className={styles.error} role="alert">
              {problem}
            </p>
          ))}
        </Card>

        <Card>
          <CardTitle>{adminText('admin.scans.document.title')}</CardTitle>
          <div className={styles.form}>
            <RadioGroup
              inline
              legend={adminText('admin.scans.document.type')}
              options={SCAN_KINDS.map((value) => ({
                value,
                label: adminText(`admin.scans.kind.${value}`),
              }))}
              value={state.kind}
              onChange={(kind: ScanKind) => {
                patch({ kind });
                setErrors({});
              }}
            />
            {state.kind === 'EXAM' ? (
              <SelectField
                label={adminText('admin.scans.field.examKind')}
                options={EXAM_KINDS.map((value) => ({
                  value,
                  label: adminText(`admin.scans.examKind.${value}`),
                }))}
                value={state.examKind}
                onChange={(event) => patch({ examKind: event.target.value as ExamKind })}
              />
            ) : null}
            {state.kind === 'MATERIAL' ? (
              <SelectField
                label={adminText('admin.scans.field.materialKind')}
                options={SCAN_MATERIAL_KINDS.map((value) => ({
                  value,
                  label: adminText(`admin.scans.material.${value}`),
                }))}
                value={state.materialKind}
                onChange={(event) =>
                  patch({ materialKind: event.target.value as ScanMaterialKind })
                }
              />
            ) : null}
            {state.kind === 'QUIZ' ? (
              <SelectField
                label={adminText('admin.scans.field.quiz')}
                options={QUIZ_VALUES.map((value) => ({
                  value: String(value),
                  label: adminText(`admin.nav.quiz${value}`),
                }))}
                value={String(state.quizNo)}
                onChange={(event) => patch({ quizNo: Number(event.target.value) as QuizNumber })}
              />
            ) : null}
          </div>
        </Card>

        <Card>
          <CardTitle>{adminText('admin.scans.details.title')}</CardTitle>
          <div className={styles.form}>
            <div className={styles.grid}>
              {parts.examSet ? (
                <TextField
                  label={adminText('admin.scans.field.examSetId')}
                  autoComplete="off"
                  value={state.examSetId}
                  onChange={text('examSetId')}
                  error={errors.examSetId}
                />
              ) : null}
              <SelectField
                label={adminText('admin.scans.field.university')}
                placeholder={adminText('admin.scans.field.selectUniversity')}
                options={(universities.data ?? []).map((item) => ({
                  value: item.id,
                  label: item.shortName,
                }))}
                value={state.universityId}
                onChange={(event) =>
                  patch(
                    { universityId: event.target.value, programId: '', courseId: '', topicId: '' },
                    'universityId',
                    'programId',
                  )
                }
                error={errors.universityId}
              />
              <SelectField
                label={adminText('admin.scans.field.program')}
                placeholder={adminText('admin.scans.field.selectProgram')}
                options={programOptions}
                value={state.programId}
                disabled={state.universityId === ''}
                onChange={(event) =>
                  patch({ programId: event.target.value, courseId: '', topicId: '' }, 'programId')
                }
                error={errors.programId}
              />
              {parts.year ? (
                <TextField
                  label={adminText('admin.scans.field.year')}
                  inputMode="numeric"
                  autoComplete="off"
                  value={state.year}
                  onChange={text('year')}
                  error={errors.year}
                />
              ) : null}
              {parts.scope ? (
                <>
                  <SelectField
                    label={adminText('admin.scans.field.semester')}
                    placeholder={adminText('admin.scans.field.selectSemester')}
                    options={[
                      {
                        value: '1',
                        label: adminText('admin.catalog.form.semesterOption', { n: 1 }),
                      },
                      {
                        value: '2',
                        label: adminText('admin.catalog.form.semesterOption', { n: 2 }),
                      },
                    ]}
                    value={state.semester}
                    onChange={(event) =>
                      patch(
                        {
                          semester: event.target.value as ScanFormState['semester'],
                          courseId: '',
                          topicId: '',
                        },
                        'semesterNumber',
                      )
                    }
                    error={errors.semesterNumber}
                  />
                  <SelectField
                    label={adminText('admin.scans.field.stream')}
                    placeholder={adminText('admin.scans.field.selectStream')}
                    options={STREAMS.map((value) => ({
                      value,
                      label: adminText(`admin.stream.${value}`),
                    }))}
                    value={state.stream}
                    onChange={(event) =>
                      patch(
                        { stream: event.target.value as Stream | '', courseId: '', topicId: '' },
                        'stream',
                      )
                    }
                    error={errors.stream}
                  />
                  <SelectField
                    label={adminText('admin.scans.field.course')}
                    placeholder={adminText('admin.scans.field.selectCourse')}
                    options={(courses.data ?? []).map((item) => ({
                      value: item.id,
                      label: `${item.code} · ${item.title}`,
                    }))}
                    value={state.courseId}
                    disabled={(courses.data ?? []).length === 0}
                    onChange={(event) =>
                      patch({ courseId: event.target.value, topicId: '' }, 'courseId')
                    }
                    error={errors.courseId}
                  />
                </>
              ) : null}
              {parts.topic ? (
                <SelectField
                  label={adminText('admin.scans.field.topic')}
                  placeholder={adminText('admin.scans.field.selectTopic')}
                  options={(topics.data ?? []).map((item) => ({
                    value: item.id,
                    label: `${item.code} ${item.title.en}`,
                  }))}
                  value={state.topicId}
                  disabled={(topics.data ?? []).length === 0}
                  onChange={text('topicId')}
                  error={errors.topicId}
                />
              ) : null}
            </div>
            {parts.textFields ? (
              <>
                <TextField
                  label={adminText('admin.scans.field.title')}
                  autoComplete="off"
                  value={state.title}
                  onChange={text('title')}
                  error={errors.title}
                />
                <TextArea
                  label={adminText('admin.scans.field.description')}
                  rows={3}
                  maxLength={SCAN_DESCRIPTION_MAX}
                  value={state.description}
                  onChange={text('description')}
                  error={errors.description}
                />
              </>
            ) : null}
          </div>
        </Card>

        {parts.answers ? (
          <Card>
            <CardTitle>{adminText('admin.scans.answers.title')}</CardTitle>
            <p className={styles.hint}>{adminText('admin.scans.answers.hint')}</p>
            <AnswersEditor
              answers={state.answers}
              withType={parts.questionType}
              errors={errors}
              onChange={(answers) => patch({ answers })}
              onRejected={setRejected}
            />
          </Card>
        ) : null}

        {failure ? (
          <p className={styles.failure} role="alert">
            {failure}
          </p>
        ) : null}
        <div className={styles.footer}>
          <Button disabled={busy} onClick={() => void save()}>
            {busy ? adminText('admin.common.saving') : adminText('admin.scans.save')}
          </Button>
        </div>
      </div>
    </>
  );
}
