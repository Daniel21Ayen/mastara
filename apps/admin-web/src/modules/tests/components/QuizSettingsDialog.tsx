// apps/admin-web/src/modules/tests/components/QuizSettingsDialog.tsx
'use client';

import { quizSettingsSchema } from '@mastara/contracts';
import type { QuizSummary } from '@mastara/contracts';
import { canPublishQuiz } from '@mastara/domain';
import type { CatalogStatus } from '@mastara/domain';
import { useState } from 'react';
import type { FormEvent } from 'react';

import { adminText, errorText } from '@/core/i18n';
import {
  fieldErrors,
  FormShell,
  reasonProblem,
  reasonRequired,
  StatusFields,
} from '@/shared/forms';

import { testsApi } from '../api/tests.api';

type Field = 'status' | 'reason';

interface QuizSettingsDialogProps {
  courseId: string;
  quiz: QuizSummary;
  onSaved: (notice: string) => void;
  onClose: () => void;
}

/** Access is bound to Course Entitlement. Taking a live quiz away needs a reason. */
export function QuizSettingsDialog({ courseId, quiz, onSaved, onClose }: QuizSettingsDialogProps) {
  const [status, setStatus] = useState<CatalogStatus>(quiz.status);
  const [reason, setReason] = useState('');
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setFailure(null);

    const needsReason = reasonRequired(quiz.status, status);
    const parsed = quizSettingsSchema.safeParse({
      status,
      minutes: 0,
      reason: needsReason ? reason : undefined,
    });
    const next: Partial<Record<Field, string>> = parsed.success
      ? {}
      : fieldErrors<Field>(parsed.error.issues);
    if (status === 'PUBLISHED' && !canPublishQuiz(quiz.publishedQuestionCount)) {
      next.status = adminText('admin.tests.settings.needsQuestion');
    }
    const reasonError = reasonProblem(needsReason, reason);
    if (reasonError) next.reason = reasonError;
    if (!parsed.success || Object.keys(next).length > 0) {
      setErrors(next);
      if (next.status) setFailure(next.status);
      return;
    }
    setErrors({});
    setBusy(true);
    try {
      await testsApi.updateQuiz(courseId, quiz.quizNo, parsed.data);
      onSaved(adminText('admin.tests.settings.saved', { n: quiz.quizNo }));
      onClose();
    } catch (cause) {
      setFailure(errorText(cause));
      setBusy(false);
    }
  }

  return (
    <FormShell
      title={adminText('admin.tests.settings.title', { n: quiz.quizNo })}
      submitLabel={adminText('admin.common.save')}
      busy={busy}
      failure={failure}
      onSubmit={submit}
      onClose={onClose}
    >
      <div
        style={{
          background: 'var(--color-success-soft)',
          border: '1px solid var(--color-border)',
          borderRadius: '8px',
          padding: '0.85rem 1rem',
          color: 'var(--color-success)',
          fontSize: '0.825rem',
          lineHeight: '1.45',
          marginBottom: '1rem',
        }}
      >
        <strong>Course Entitlement Model:</strong> Quizzes are untimed self-check assessments bound directly to course enrollment. Students inherit access upon course purchase/enrollment.
      </div>
      <StatusFields
        value={status}
        saved={quiz.status}
        reason={reason}
        reasonError={errors.reason}
        onStatus={(value) => {
          setStatus(value);
          setErrors((current) => ({ ...current, status: undefined }));
        }}
        onReason={(value) => {
          setReason(value);
          setErrors((current) => ({ ...current, reason: undefined }));
        }}
      />
    </FormShell>
  );
}
