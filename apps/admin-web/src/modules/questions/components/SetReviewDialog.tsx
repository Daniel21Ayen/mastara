// apps/admin-web/src/modules/questions/components/SetReviewDialog.tsx
'use client';

import type { ExamSet } from '@mastara/contracts';
import { needsCourse, questionProblems, setProblems } from '@mastara/domain';
import { useState } from 'react';

import { adminText, errorText } from '@/core/i18n';
import { QuestionPreviewDialog, StatusBadge } from '@/modules/tests';
import { reasonProblem } from '@/shared/forms';
import { Badge, Button, Modal, TextArea } from '@/shared/ui';

import { questionsApi } from '../api/questions.api';
import { inputFromSet, previewOf } from '../lib/examSetForm';

import { yearText } from './SetFields';
import styles from './Questions.module.css';

interface SetReviewDialogProps {
  set: ExamSet;
  /** Verify can publish or unpublish the set; View only looks. */
  canChange: boolean;
  onClose: () => void;
  onChanged: () => void;
}

/** Looks through a set the way a student would, checks it is finished, and (Verify) publishes it. */
export function SetReviewDialog({ set, canChange, onClose, onChanged }: SetReviewDialogProps) {
  const [previewing, setPreviewing] = useState<ExamSet['questions'][number] | null>(null);
  const [reason, setReason] = useState('');
  const [reasonError, setReasonError] = useState<string | undefined>();
  const [failure, setFailure] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const problems = setProblems({ kind: set.kind, questions: set.questions });
  const published = set.status === 'PUBLISHED';

  async function change() {
    if (busy) return;
    setFailure(null);
    const problem = reasonProblem(published, reason);
    setReasonError(problem);
    if (problem) return;
    setBusy(true);
    try {
      await questionsApi.saveSet(
        inputFromSet(set, published ? 'DRAFT' : 'PUBLISHED', published ? reason : undefined),
      );
      onChanged();
      onClose();
    } catch (cause) {
      setFailure(errorText(cause));
      setBusy(false);
    }
  }

  const where = [set.universityName, set.programName, adminText(`admin.questions.semester.${set.semesterNumber}`)];

  return (
    <>
      <Modal
        title={adminText(canChange ? 'admin.questions.verify.title' : 'admin.questions.view.title', {
          id: set.id,
        })}
        onClose={onClose}
        wide
      >
        <dl className={styles.summary}>
          <div>
            <dt>{adminText('admin.questions.field.university')}</dt>
            <dd>{where.join(' · ')}</dd>
          </div>
          {needsCourse(set.kind) ? (
            <div>
              <dt>{adminText('admin.questions.field.course')}</dt>
              <dd>{`${set.courseCode ?? ''} · ${set.courseTitle ?? ''}`}</dd>
            </div>
          ) : null}
          <div>
            <dt>{adminText('admin.questions.field.stream')}</dt>
            <dd>{adminText(`admin.stream.${set.stream}`)}</dd>
          </div>
          <div>
            <dt>{adminText('admin.questions.field.year')}</dt>
            <dd>{yearText(set.year)}</dd>
          </div>
          <div>
            <dt>{adminText('admin.questions.field.access')}</dt>
            <dd>{adminText(set.isFree ? 'admin.questions.access.FREE' : 'admin.questions.access.PAID')}</dd>
          </div>
          <div>
            <dt>{adminText('admin.questions.field.minutes')}</dt>
            <dd>{set.minutes}</dd>
          </div>
          <div>
            <dt>{adminText('admin.questions.col.status')}</dt>
            <dd>
              <StatusBadge status={set.status} />
            </dd>
          </div>
        </dl>

        <ul className={styles.staged} aria-label={adminText('admin.questions.review.questions')}>
          {set.questions.map((question) => {
            const unfinished = questionProblems(question).length > 0;
            return (
              <li key={question.id} className={styles.stagedRow}>
                <span className={styles.stagedText}>
                  <span className={styles.stagedId}>{question.id}</span>
                  <span className={styles.stagedPrompt}>
                    {question.prompt || adminText('admin.questions.review.noPrompt')}
                  </span>
                </span>
                <Badge tone={unfinished ? 'danger' : 'primary'}>
                  {adminText(unfinished ? 'admin.questions.review.unfinished' : 'admin.questions.review.ready')}
                </Badge>
                <Button variant="outline" onClick={() => setPreviewing(question)}>
                  {adminText('admin.content.reviewAsStudent')}
                </Button>
              </li>
            );
          })}
        </ul>

        {canChange && !published && problems.length > 0 ? (
          <ul className={styles.problems} role="alert">
            {problems.map((problem) => (
              <li key={problem}>{adminText(`admin.questions.setProblem.${problem}`)}</li>
            ))}
          </ul>
        ) : null}
        {canChange && published ? (
          <TextArea
            label={adminText('admin.catalog.form.unpublishReason')}
            value={reason}
            onChange={(event) => {
              setReason(event.target.value);
              setReasonError(undefined);
            }}
            error={reasonError}
          />
        ) : null}
        {failure ? (
          <p className={styles.failure} role="alert">
            {failure}
          </p>
        ) : null}

        <div className={styles.dialogActions}>
          <Button variant="outline" onClick={onClose}>
            {adminText('admin.common.close')}
          </Button>
          {canChange ? (
            <Button
              variant={published ? 'danger' : 'primary'}
              disabled={busy || (!published && problems.length > 0)}
              onClick={() => void change()}
            >
              {adminText(published ? 'admin.questions.verify.unpublish' : 'admin.questions.verify.publish')}
            </Button>
          ) : null}
        </div>
      </Modal>
      {previewing ? (
        <QuestionPreviewDialog question={previewOf(previewing)} onClose={() => setPreviewing(null)} />
      ) : null}
    </>
  );
}
