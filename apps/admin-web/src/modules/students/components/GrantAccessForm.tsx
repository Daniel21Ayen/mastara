// apps/admin-web/src/modules/students/components/GrantAccessForm.tsx
'use client';

import { grantAccessSchema } from '@mastara/contracts';
import type { GrantAccessInput, StudentDetail } from '@mastara/contracts';
import { accessEndAfterGrant, DEFAULT_GRANT_DAYS, isExtension } from '@mastara/domain';
import { useState } from 'react';
import type { FormEvent } from 'react';

import { formatDate } from '@/core/format';
import { adminText, adminTextFor } from '@/core/i18n';
import { Button, Card, CardTitle, SelectField, TextField } from '@/shared/ui';

import { ActionDialog } from './ActionDialog';
import styles from './GrantAccessForm.module.css';

interface GrantAccessFormProps {
  student: StudentDetail;
  /** Saves the grant. Resolves with the updated student; the form shows the result message. */
  onGrant: (input: GrantAccessInput) => Promise<void>;
}

interface FieldErrors {
  courseId?: string;
  days?: string;
  reason?: string;
}

/** Inline "Grant or extend access" card (design screen 4). Apply opens a confirmation first. */
export function GrantAccessForm({ student, onGrant }: GrantAccessFormProps) {
  const [courseId, setCourseId] = useState('');
  const [days, setDays] = useState(String(DEFAULT_GRANT_DAYS));
  const [reason, setReason] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [pending, setPending] = useState<GrantAccessInput | null>(null);

  function apply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = grantAccessSchema.safeParse({
      courseId,
      days: days.trim() === '' ? Number.NaN : Number(days),
      reason,
    });
    if (!parsed.success) {
      const next: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const field = issue.path[0];
        if ((field === 'courseId' || field === 'days' || field === 'reason') && !next[field]) {
          next[field] = adminTextFor(issue.message);
        }
      }
      setErrors(next);
      return;
    }
    setErrors({});
    setPending(parsed.data);
  }

  // What the confirmation shows: the course, and the end date after the grant.
  const course = pending
    ? student.courses.find((item) => item.courseId === pending.courseId)
    : undefined;
  const preview = (() => {
    if (!pending || !course) return null;
    const now = Date.now();
    const currentEnd =
      course.access === 'PAID' && course.expiresAt ? Date.parse(course.expiresAt) : undefined;
    const end = accessEndAfterGrant(currentEnd, pending.days, now);
    return {
      extension: isExtension(currentEnd, now),
      date: formatDate(new Date(end).toISOString()),
    };
  })();

  return (
    <Card aria-labelledby="grant-title">
      <CardTitle id="grant-title">{adminText('admin.student.grant.title')}</CardTitle>

      {student.courses.length === 0 ? (
        <p className={styles.note}>{adminText('admin.student.grant.noCourses')}</p>
      ) : (
        <form className={styles.form} onSubmit={apply} noValidate>
          <SelectField
            label={adminText('admin.student.grant.course')}
            options={student.courses.map((item) => ({ value: item.courseId, label: item.title }))}
            placeholder={adminText('admin.student.grant.selectCourse')}
            value={courseId}
            onChange={(event) => setCourseId(event.target.value)}
            error={errors.courseId}
          />
          <TextField
            label={adminText('admin.student.grant.days')}
            type="number"
            inputMode="numeric"
            min={1}
            value={days}
            onChange={(event) => setDays(event.target.value)}
            error={errors.days}
          />
          <TextField
            label={adminText('admin.student.grant.reason')}
            type="text"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            error={errors.reason}
          />
          <Button type="submit" className={styles.apply}>
            {adminText('admin.student.grant.apply')}
          </Button>
        </form>
      )}

      {pending && course && preview ? (
        <ActionDialog
          title={adminText('admin.student.grant.confirmTitle', {
            days: pending.days,
            course: course.title,
          })}
          body={adminText(
            preview.extension
              ? 'admin.student.grant.confirmBodyExtend'
              : 'admin.student.grant.confirmBodyGrant',
            { name: student.name, course: course.title, date: preview.date },
          )}
          confirmLabel={adminText('admin.common.confirm')}
          onConfirm={async () => {
            await onGrant(pending);
            setCourseId('');
            setReason('');
            setDays(String(DEFAULT_GRANT_DAYS));
          }}
          onClose={() => setPending(null)}
        />
      ) : null}
    </Card>
  );
}
