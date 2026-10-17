// apps/admin-web/src/modules/questions/components/BuildSetDialog.tsx
'use client';

import { examSetInputSchema } from '@mastara/contracts';
import { examSetSlug, needsCourse, SET_YEARS, STREAMS } from '@mastara/domain';
import type { ExamSetKind, Stream } from '@mastara/domain';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { adminText, errorText } from '@/core/i18n';
import { programsOf, usePrograms, useScanCourses, useUniversities } from '@/modules/scans';
import { fieldErrors } from '@/shared/forms';
import { Button, Modal, SelectField, TextField } from '@/shared/ui';

import { questionsApi } from '../api/questions.api';
import { emptyDetails, toSetInput } from '../lib/examSetForm';
import type { SetDetailsState } from '../lib/examSetForm';
import { yearText } from './SetFields';
import type { SetErrors } from './SetFields';
import styles from './Questions.module.css';

/** Build Exam Set: names the set and says who it is for. It starts as a draft; questions come next. */
export function BuildSetDialog({ kind, onClose }: { kind: ExamSetKind; onClose: () => void }) {
  const router = useRouter();
  const [details, setDetails] = useState<SetDetailsState>(emptyDetails());
  const [errors, setErrors] = useState<SetErrors>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const universities = useUniversities();
  const programs = usePrograms();
  const courses = useScanCourses(details.programId, details.semester, details.stream);

  const isMock = kind === 'MOCK';
  const hasCourse = needsCourse(kind);

  const programOptions = isMock
    ? (programs.data ?? []).map((p) => ({ value: p.id, label: p.name }))
    : programsOf(programs.data ?? [], details.universityId).map((p) => ({
        value: p.id,
        label: p.name,
      }));

  const change = (patch: Partial<SetDetailsState>, ...clear: string[]) => {
    setDetails((current) => ({ ...current, ...patch }));
    setErrors((current) => {
      const next = { ...current };
      for (const key of clear) next[key] = undefined;
      return next;
    });
  };

  async function build() {
    if (busy) return;
    setFailure(null);
    const parsed = examSetInputSchema.safeParse(toSetInput(kind, details, [], 'DRAFT'));
    if (!parsed.success) {
      setErrors(fieldErrors<string>(parsed.error.issues));
      return;
    }
    setBusy(true);
    try {
      if (await questionsApi.findSet(parsed.data.id)) {
        setErrors({ id: adminText('admin.questions.problem.setExists') });
        setBusy(false);
        return;
      }
      const saved = await questionsApi.saveSet(parsed.data);
      onClose();
      router.push(`/questions/${examSetSlug(kind)}/${saved.id}`);
    } catch (cause) {
      setFailure(errorText(cause));
      setBusy(false);
    }
  }

  return (
    <Modal title={adminText(`admin.questions.build.${kind}`)} onClose={onClose} wide>
      <div className={styles.form}>
        <p className={styles.hint}>
          Define the target academic scope, course and parameters for this new exam set.
        </p>

        {/* Section 1: Academic Scope */}
        <div className={styles.buildSection}>
          <h4 className={styles.buildSectionTitle}>1. Target Academic Scope</h4>
          <div className={isMock ? styles.row3 : styles.row4}>
            {!isMock ? (
              <SelectField
                label={adminText('admin.questions.field.university')}
                placeholder={adminText('admin.scans.field.selectUniversity')}
                options={(universities.data ?? []).map((item) => ({
                  value: item.id,
                  label: item.shortName,
                }))}
                value={details.universityId}
                onChange={(event) =>
                  change(
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
              onChange={(event) => change({ programId: event.target.value, courseId: '' }, 'programId')}
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
                change(
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
                change({ stream: event.target.value as Stream | '', courseId: '' }, 'stream')
              }
              error={errors.stream}
            />
          </div>
        </div>

        {/* Section 2: Course & Assessment Year */}
        <div className={styles.buildSection}>
          <h4 className={styles.buildSectionTitle}>2. Course & Assessment Year</h4>
          <div className={hasCourse ? styles.row2 : styles.row1}>
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
                onChange={(event) => change({ courseId: event.target.value }, 'courseId')}
                error={errors.courseId}
              />
            ) : null}
            {!isMock ? (
              <SelectField
                label={adminText('admin.questions.field.year')}
                options={SET_YEARS.map((year) => ({ value: String(year), label: yearText(year) }))}
                value={details.year}
                onChange={(event) => change({ year: event.target.value }, 'year')}
                error={errors.year}
              />
            ) : null}
          </div>
        </div>

        {/* Section 3: Exam Parameters */}
        <div className={styles.buildSection}>
          <h4 className={styles.buildSectionTitle}>3. Exam Parameters</h4>
          <div className={styles.row3}>
            <TextField
              label={adminText('admin.questions.field.examSetId')}
              placeholder={adminText('admin.questions.field.examSetId')}
              value={details.id}
              onChange={(event) => change({ id: event.target.value }, 'id')}
              error={errors.id}
            />
            <TextField
              label={adminText('admin.questions.field.minutes')}
              type="number"
              min={1}
              max={300}
              value={details.minutes}
              onChange={(event) => change({ minutes: event.target.value }, 'minutes')}
              error={errors.minutes}
            />
            <SelectField
              label={adminText('admin.questions.field.access')}
              options={[
                { value: 'false', label: 'Paid course only' },
                { value: 'true', label: 'Free preview' },
              ]}
              value={details.isFree ? 'true' : 'false'}
              onChange={(event) => change({ isFree: event.target.value === 'true' })}
            />
          </div>
        </div>

        {failure ? (
          <p className={styles.failure} role="alert">
            {failure}
          </p>
        ) : null}

        <div className={styles.dialogActions}>
          <Button variant="outline" onClick={onClose}>
            {adminText('admin.common.cancel')}
          </Button>
          <Button disabled={busy} onClick={() => void build()}>
            {busy ? adminText('admin.common.saving') : adminText('admin.questions.build.create')}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
