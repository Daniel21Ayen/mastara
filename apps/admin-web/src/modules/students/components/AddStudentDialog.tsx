// apps/admin-web/src/modules/students/components/AddStudentDialog.tsx
'use client';

import { createStudentSchema } from '@mastara/contracts';
import type { StudentDetail } from '@mastara/contracts';
import { STUDENT_STREAMS } from '@mastara/domain';
import type { StudentStream } from '@mastara/domain';
import { useState } from 'react';
import type { FormEvent } from 'react';

import { adminText, adminTextFor, errorText } from '@/core/i18n';
import { Button, Modal, SelectField, StateMessage, TextField } from '@/shared/ui';

import { studentsApi } from '../api/students.api';
import { useStudentOptions } from '../hooks/useStudents';

import styles from './ActionDialog.module.css';

type Field = 'name' | 'identifier' | 'universityId' | 'programId' | 'semesterId' | 'stream';

interface AddStudentDialogProps {
  onCreated: (student: StudentDetail) => void;
  onClose: () => void;
}

export function AddStudentDialog({ onCreated, onClose }: AddStudentDialogProps) {
  const options = useStudentOptions();
  const [name, setName] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [universityId, setUniversityId] = useState('');
  const [programId, setProgramId] = useState('');
  const [semesterId, setSemesterId] = useState('');
  const [stream, setStream] = useState<StudentStream>('NATURAL');
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const programs =
    options.data?.programs.filter((program) => program.universityId === universityId) ?? [];
  const semesters =
    options.data?.semesters.filter((semester) => semester.programId === programId) ?? [];

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setFailure(null);

    const parsed = createStudentSchema.safeParse({
      name,
      identifier,
      universityId,
      programId,
      semesterId,
      stream,
    });
    if (!parsed.success) {
      const next: Partial<Record<Field, string>> = {};
      for (const issue of parsed.error.issues) {
        const field = issue.path[0] as Field;
        if (!next[field]) next[field] = adminTextFor(issue.message);
      }
      setErrors(next);
      return;
    }
    setErrors({});
    setBusy(true);
    try {
      onCreated(await studentsApi.create(parsed.data));
    } catch (cause) {
      setFailure(errorText(cause));
      setBusy(false);
    }
  }

  return (
    <Modal
      title={adminText('admin.students.create.title')}
      onClose={busy ? () => undefined : onClose}
    >
      {options.loading && !options.data ? (
        <StateMessage>{adminText('admin.common.loading')}</StateMessage>
      ) : null}
      {options.error ? (
        <StateMessage tone="alert">
          <span>{adminText('admin.error.generic')}</span>
          <Button variant="outline" onClick={options.reload}>
            {adminText('admin.common.retry')}
          </Button>
        </StateMessage>
      ) : null}

      {options.data ? (
        <form className={styles.form} onSubmit={submit} noValidate>
          <div
            style={{
              padding: '0.625rem 0.875rem',
              borderRadius: '6px',
              background: 'var(--color-success-soft)',
              border: '1px solid var(--color-border)',
              fontSize: '0.8125rem',
              color: 'var(--color-success)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            <span>ℹ️</span>
            <span>
              Official Student ID (<strong>MS0001+</strong>) is automatically assigned sequentially upon registration.
            </span>
          </div>
          <TextField
            label={adminText('admin.students.create.name')}
            autoComplete="off"
            value={name}
            onChange={(event) => setName(event.target.value)}
            error={errors.name}
            autoFocus
          />
          <TextField
            label={adminText('admin.students.create.identifier')}
            autoComplete="off"
            value={identifier}
            onChange={(event) => setIdentifier(event.target.value)}
            error={errors.identifier}
          />
          <SelectField
            label={adminText('admin.students.create.university')}
            placeholder={adminText('admin.students.create.selectUniversity')}
            options={options.data.universities.map((item) => ({
              value: item.id,
              label: item.shortName,
            }))}
            value={universityId}
            onChange={(event) => {
              setUniversityId(event.target.value);
              setProgramId('');
              setSemesterId('');
            }}
            error={errors.universityId}
          />
          <SelectField
            label={adminText('admin.students.create.program')}
            placeholder={adminText('admin.students.create.selectProgram')}
            options={programs.map((item) => ({ value: item.id, label: item.name }))}
            value={programId}
            disabled={!universityId}
            onChange={(event) => {
              setProgramId(event.target.value);
              setSemesterId('');
            }}
            error={errors.programId}
          />
          <SelectField
            label={adminText('admin.students.create.semester')}
            placeholder={adminText('admin.students.create.selectSemester')}
            options={semesters.map((item) => ({
              value: item.id,
              label: adminText('admin.students.create.semesterOption', { n: item.number }),
            }))}
            value={semesterId}
            disabled={!programId}
            onChange={(event) => setSemesterId(event.target.value)}
            error={errors.semesterId}
          />
          <SelectField
            label={adminText('admin.students.create.stream')}
            options={STUDENT_STREAMS.map((value) => ({
              value,
              label: adminText(`admin.stream.${value}`),
            }))}
            value={stream}
            onChange={(event) => setStream(event.target.value as StudentStream)}
          />

          {failure ? (
            <p className={styles.failure} role="alert">
              {failure}
            </p>
          ) : null}

          <div className={styles.buttons}>
            <Button variant="outline" onClick={onClose} disabled={busy}>
              {adminText('admin.common.cancel')}
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? adminText('admin.common.saving') : adminText('admin.students.create.submit')}
            </Button>
          </div>
        </form>
      ) : null}
    </Modal>
  );
}
