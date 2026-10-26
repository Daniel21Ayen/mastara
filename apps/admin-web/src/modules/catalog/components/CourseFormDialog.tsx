// apps/admin-web/src/modules/catalog/components/CourseFormDialog.tsx
'use client';

import { createCourseSchema, updateCourseSchema } from '@mastara/contracts';
import type { AdminCourse } from '@mastara/contracts';
import { ALL_UNIVERSITIES, COURSE_ACCENTS, FREE_TRIAL_MAX_ITEMS, STREAMS } from '@mastara/domain';
import type { CatalogStatus, CourseAccent, Stream } from '@mastara/domain';
import { useState } from 'react';
import type { FormEvent } from 'react';

import { adminText, errorText } from '@/core/i18n';
import {
  FormShell,
  fieldErrors,
  reasonProblem,
  reasonRequired,
  StatusFields,
} from '@/shared/forms';
import { SelectField, StateMessage, TextField } from '@/shared/ui';

import { catalogApi } from '../api/catalog.api';
import { usePrograms, useSemesters, useUniversities } from '../hooks/useCatalog';
import { UniversityLogo } from './UniversityLogo';

import styles from './CourseFormDialog.module.css';

type Field =
  | 'universityId'
  | 'semesterId'
  | 'semesterNumber'
  | 'code'
  | 'title'
  | 'stream'
  | 'accent'
  | 'icon'
  | 'freeAccess'
  | 'freeTrialItems';

interface CourseFormDialogProps {
  /** The course to edit. Leave out to add a new one. */
  course?: AdminCourse;
  /** Called with the confirmation text after a successful save. */
  onSaved: (notice: string) => void;
  onClose: () => void;
}

export function CourseFormDialog({ course, onSaved, onClose }: CourseFormDialogProps) {
  const universities = useUniversities();
  const programs = usePrograms();
  const semesters = useSemesters();

  const [universityId, setUniversityId] = useState('');
  const [programId, setProgramId] = useState('');
  const [semesterId, setSemesterId] = useState('');
  const [semesterNumber, setSemesterNumber] = useState('');
  const [code, setCode] = useState(course?.code ?? '');
  const [title, setTitle] = useState(course?.title ?? '');
  const [stream, setStream] = useState<Stream>(course?.stream ?? 'COMMON');
  const [accent, setAccent] = useState<CourseAccent>((course?.accent as CourseAccent) ?? 'blue');
  const [icon, setIcon] = useState(course?.icon ?? 'book');
  const [freeAccess, setFreeAccess] = useState(Boolean(course?.freeAccess));
  const [freeTrial, setFreeTrial] = useState(String(course?.freeTrialItems ?? 0));
  const [status, setStatus] = useState<CatalogStatus>(course?.status ?? 'DRAFT');
  const [reason, setReason] = useState('');
  const [errors, setErrors] = useState<Partial<Record<Field | 'reason', string>>>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const editing = course !== undefined;
  const needsReason = reasonRequired(course?.status, status);
  const optionsReady = editing || (universities.data && programs.data && semesters.data);
  const optionsFailed = !editing && (universities.error || programs.error || semesters.error);

  const sharedScope = universityId === ALL_UNIVERSITIES;
  const chosenUniversity = (universities.data ?? []).find((item) => item.id === universityId);

  const programOptions = (programs.data ?? []).filter((item) => item.universityId === universityId);
  const semesterOptions = (semesters.data ?? []).filter((item) => item.programId === programId);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setFailure(null);

    const fields = {
      code,
      title,
      stream,
      accent,
      icon,
      freeAccess,
      freeTrialItems: freeTrial.trim() === '' ? Number.NaN : Number(freeTrial),
      status,
    };
    const scope = sharedScope
      ? { semesterNumber: semesterNumber === '' ? undefined : (Number(semesterNumber) as 1 | 2) }
      : { semesterId };
    const parsed = editing
      ? updateCourseSchema.safeParse({ ...fields, reason: needsReason ? reason : undefined })
      : createCourseSchema.safeParse({ universityId, ...scope, ...fields });
    const reasonError = reasonProblem(needsReason, reason);
    if (!parsed.success || reasonError) {
      setErrors({
        ...(parsed.success ? {} : fieldErrors<Field>(parsed.error.issues)),
        ...(reasonError ? { reason: reasonError } : {}),
      });
      return;
    }
    setErrors({});
    setBusy(true);
    try {
      if (editing) {
        const saved = await catalogApi.updateCourse(course.id, parsed.data);
        onSaved(adminText('admin.catalog.courses.saved', { code: saved.code }));
      } else {
        const created = await catalogApi.createCourse({ universityId, ...scope, ...fields });
        onSaved(adminText('admin.catalog.courses.created', { code: created.code }));
      }
      onClose();
    } catch (cause) {
      setFailure(errorText(cause));
      setBusy(false);
    }
  }

  return (
    <FormShell
      title={adminText(
        editing ? 'admin.catalog.courses.editTitle' : 'admin.catalog.courses.addTitle',
      )}
      submitLabel={adminText(editing ? 'admin.common.save' : 'admin.catalog.courses.addSubmit')}
      busy={busy}
      failure={failure}
      onSubmit={submit}
      onClose={onClose}
    >
      {!optionsReady && !optionsFailed ? (
        <StateMessage>{adminText('admin.common.loading')}</StateMessage>
      ) : null}
      {optionsFailed ? (
        <StateMessage tone="alert">{adminText('admin.error.generic')}</StateMessage>
      ) : null}

      {optionsReady ? (
        <>
          {editing ? (
            <p className={styles.scope}>
              {course.programName === null
                ? adminText('admin.catalog.courses.scopeAll', { semester: course.semesterNumber })
                : adminText('admin.catalog.courses.scope', {
                    university: course.universityShortName,
                    program: course.programName,
                    semester: course.semesterNumber,
                  })}
            </p>
          ) : (
            <>
              <SelectField
                label={adminText('admin.catalog.form.university')}
                placeholder={adminText('admin.catalog.form.selectUniversity')}
                options={[
                  { value: ALL_UNIVERSITIES, label: adminText('admin.catalog.form.allUniversities') },
                  ...(universities.data ?? []).map((item) => ({
                    value: item.id,
                    label: item.shortName,
                  })),
                ]}
                value={universityId}
                error={errors.universityId}
                onChange={(event) => {
                  setUniversityId(event.target.value);
                  setProgramId('');
                  setSemesterId('');
                  setSemesterNumber('');
                }}
              />
              {universityId ? (
                <p className={styles.logoRow}>
                  <UniversityLogo
                    id={universityId}
                    shortName={chosenUniversity?.shortName ?? ''}
                    logoUrl={chosenUniversity?.logoUrl}
                    size={48}
                  />
                  <span>
                    {sharedScope
                      ? adminText('admin.catalog.form.allUniversitiesHint')
                      : (chosenUniversity?.name ?? '')}
                  </span>
                </p>
              ) : null}
              {sharedScope ? (
                <SelectField
                  label={adminText('admin.catalog.form.semester')}
                  placeholder={adminText('admin.catalog.form.selectSemester')}
                  options={([1, 2] as const).map((n) => ({
                    value: String(n),
                    label: adminText('admin.catalog.form.semesterOption', { n }),
                  }))}
                  value={semesterNumber}
                  onChange={(event) => setSemesterNumber(event.target.value)}
                  error={errors.semesterNumber}
                />
              ) : (
                <>
                  <SelectField
                    label={adminText('admin.catalog.form.program')}
                    placeholder={adminText('admin.catalog.form.selectProgram')}
                    options={programOptions.map((item) => ({ value: item.id, label: item.name }))}
                    value={programId}
                    disabled={!universityId}
                    onChange={(event) => {
                      setProgramId(event.target.value);
                      setSemesterId('');
                    }}
                  />
                  <SelectField
                    label={adminText('admin.catalog.form.semester')}
                    placeholder={adminText('admin.catalog.form.selectSemester')}
                    options={semesterOptions.map((item) => ({
                      value: item.id,
                      label: adminText('admin.catalog.form.semesterOption', { n: item.number }),
                    }))}
                    value={semesterId}
                    disabled={!programId}
                    onChange={(event) => setSemesterId(event.target.value)}
                    error={errors.semesterId}
                  />
                </>
              )}
            </>
          )}
          <TextField
            label={adminText('admin.catalog.courses.code')}
            autoComplete="off"
            value={code}
            onChange={(event) => setCode(event.target.value)}
            error={errors.code}
            autoFocus
          />
          <TextField
            label={adminText('admin.catalog.courses.titleField')}
            autoComplete="off"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            error={errors.title}
          />
          <SelectField
            label={adminText('admin.catalog.courses.stream')}
            options={STREAMS.map((value) => ({ value, label: adminText(`admin.stream.${value}`) }))}
            value={stream}
            onChange={(event) => setStream(event.target.value as Stream)}
          />
          <SelectField
            label="Accent Colour"
            options={COURSE_ACCENTS.map((name) => ({
              value: name,
              label: name.charAt(0).toUpperCase() + name.slice(1),
            }))}
            value={accent}
            onChange={(event) => setAccent(event.target.value as CourseAccent)}
          />
          <TextField
            label="Icon"
            autoComplete="off"
            value={icon}
            onChange={(event) => setIcon(event.target.value)}
            error={errors.icon}
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '8px 0' }}>
            <input
              id="course-free-access"
              type="checkbox"
              checked={freeAccess}
              onChange={(e) => setFreeAccess(e.target.checked)}
            />
            <label htmlFor="course-free-access" style={{ fontWeight: 600, fontSize: '14px', cursor: 'pointer' }}>
              Free Access (Course is 100% free to all students)
            </label>
          </div>
          <TextField
            label={adminText('admin.catalog.courses.freeTrialField')}
            hint={adminText('admin.catalog.courses.freeTrialHint', { max: FREE_TRIAL_MAX_ITEMS })}
            type="number"
            inputMode="numeric"
            min={0}
            max={FREE_TRIAL_MAX_ITEMS}
            step={1}
            value={freeTrial}
            onChange={(event) => setFreeTrial(event.target.value)}
            error={errors.freeTrialItems}
          />
          <StatusFields
            value={status}
            saved={course?.status}
            reason={reason}
            reasonError={errors.reason}
            onStatus={setStatus}
            onReason={(next) => {
              setReason(next);
              setErrors((current) => ({ ...current, reason: undefined }));
            }}
          />
        </>
      ) : null}
    </FormShell>
  );
}
