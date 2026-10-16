// apps/admin-web/src/modules/questions/screens/ExamSetsListScreen.tsx
'use client';

import type { ExamQuestion, ExamSet } from '@mastara/contracts';
import { CATALOG_STATUSES, examSetSlug, needsCourse } from '@mastara/domain';
import type { CatalogStatus, ExamSetKind } from '@mastara/domain';
import { useSearchParams } from 'next/navigation';
import { useState } from 'react';

import { adminText } from '@/core/i18n';
import { QuestionPreviewDialog, StatusBadge } from '@/modules/tests';
import {
  Button,
  ButtonLink,
  Card,
  DataTable,
  PageHeader,
  Pagination,
  SelectField,
  StateMessage,
} from '@/shared/ui';
import type { Column } from '@/shared/ui';

import { BuildSetDialog } from '../components/BuildSetDialog';
import { SetReviewDialog } from '../components/SetReviewDialog';
import { yearText } from '../components/SetFields';
import { SetTabs } from '../components/SetTabs';
import { useExamSets } from '../hooks/useExamSets';
import { previewOf } from '../lib/examSetForm';

import styles from '../components/Questions.module.css';

const IDS_SHOWN = 3;

/** Exam Set Management: the sets of one kind, with Edit, Verify and View, and the top-bar search. */
export function ExamSetsListScreen({ kind }: { kind: ExamSetKind }) {
  const q = useSearchParams().get('q')?.trim() || undefined;
  const [status, setStatus] = useState<CatalogStatus | ''>('');
  const [page, setPage] = useState(1);
  const [building, setBuilding] = useState(false);
  const [review, setReview] = useState<{ set: ExamSet; canChange: boolean } | null>(null);
  const [preview, setPreview] = useState<ExamQuestion | null>(null);

  const { data, error, loading, reload } = useExamSets({
    kind,
    status: status || undefined,
    q,
    page,
  });
  const slug = examSetSlug(kind);

  const columns: Column<ExamSet>[] = [
    {
      key: 'university',
      header: adminText('admin.questions.col.university'),
      render: (row) => row.universityName,
    },
    {
      key: 'id',
      header: adminText('admin.questions.col.examSetId'),
      render: (row) => row.id,
    },
    {
      key: 'program',
      header: adminText('admin.questions.col.program'),
      render: (row) => row.programName,
    },
    {
      key: 'course',
      header: adminText('admin.questions.col.course'),
      render: (row) => (needsCourse(row.kind) ? (row.courseTitle ?? '—') : adminText('admin.questions.mixed')),
    },
    {
      key: 'semester',
      header: adminText('admin.questions.col.semester'),
      render: (row) => adminText(`admin.questions.semesterShort.${row.semesterNumber}`),
    },
    {
      key: 'stream',
      header: adminText('admin.questions.col.stream'),
      render: (row) => adminText(`admin.stream.${row.stream}`),
    },
    {
      key: 'year',
      header: adminText('admin.questions.col.year'),
      render: (row) => <span className={styles.nowrap}>{yearText(row.year)}</span>,
    },
    {
      key: 'questions',
      header: adminText('admin.questions.col.questionIds'),
      render: (row) => (
        <span className={styles.ids}>
          {row.questions.slice(0, IDS_SHOWN).map((question) => (
            <button
              key={question.id}
              type="button"
              className={styles.idLink}
              onClick={() => setPreview(question)}
            >
              {question.id}
            </button>
          ))}
          {row.questions.length > IDS_SHOWN ? (
            <span className={styles.more}>
              {adminText('admin.questions.moreIds', { n: row.questions.length - IDS_SHOWN })}
            </span>
          ) : null}
          {row.questions.length === 0 ? adminText('admin.common.none') : null}
        </span>
      ),
    },
    {
      key: 'status',
      header: adminText('admin.questions.col.status'),
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: 'actions',
      header: adminText('admin.questions.col.actions'),
      render: (row) => (
        <span className={styles.rowActions}>
          <ButtonLink
            variant="outline"
            href={`/questions/${slug}/${row.id}`}
            aria-label={adminText('admin.questions.editNamed', { id: row.id })}
          >
            {adminText('admin.catalog.edit')}
          </ButtonLink>
          <Button
            aria-label={adminText('admin.questions.verifyNamed', { id: row.id })}
            onClick={() => setReview({ set: row, canChange: true })}
          >
            {adminText('admin.questions.verifyAction')}
          </Button>
          <Button
            variant="outline"
            aria-label={adminText('admin.questions.viewNamed', { id: row.id })}
            onClick={() => setReview({ set: row, canChange: false })}
          >
            {adminText('admin.questions.viewAction')}
          </Button>
        </span>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title={adminText('admin.questions.list.title')}
        actions={
          <>
            <ButtonLink variant="outline" href={`/questions/${slug}/new`}>
              {adminText('admin.questions.newQuestion')}
            </ButtonLink>
            <Button onClick={() => setBuilding(true)}>
              {adminText(kind === 'COC' ? 'admin.questions.buildCoc' : 'admin.questions.buildSet')}
            </Button>
          </>
        }
      />
      <SetTabs current={kind} />

      {error ? (
        <StateMessage tone="alert">
          <span>{adminText('admin.questions.error')}</span>
          <Button variant="outline" onClick={reload}>
            {adminText('admin.common.retry')}
          </Button>
        </StateMessage>
      ) : null}
      {loading && !data ? <StateMessage>{adminText('admin.common.loading')}</StateMessage> : null}

      {data ? (
        <Card>
          <div className={styles.toolbar}>
            <SelectField
              label={adminText('admin.catalog.filter.status')}
              placeholder={adminText('admin.catalog.filter.allStatuses')}
              options={CATALOG_STATUSES.map((value) => ({
                value,
                label: adminText(`admin.catalog.status.${value}`),
              }))}
              value={status}
              onChange={(event) => {
                setStatus(event.target.value as CatalogStatus | '');
                setPage(1);
              }}
            />
          </div>
          <div className={styles.compact}>
            <DataTable
              caption={adminText('admin.questions.list.caption', {
                kind: adminText(`admin.questions.kind.${kind}`),
              })}
              columns={columns}
              rows={data.items}
              rowKey={(row) => row.id}
              empty={adminText('admin.questions.list.empty')}
            />
          </div>
          {data.total > 0 ? (
            <Pagination
              page={data.page}
              pageCount={data.pageCount}
              shown={data.items.length}
              total={data.total}
              onPage={setPage}
            />
          ) : null}
        </Card>
      ) : null}

      {building ? <BuildSetDialog kind={kind} onClose={() => setBuilding(false)} /> : null}
      {review ? (
        <SetReviewDialog
          set={review.set}
          canChange={review.canChange}
          onClose={() => setReview(null)}
          onChanged={reload}
        />
      ) : null}
      {preview ? (
        <QuestionPreviewDialog question={previewOf(preview)} onClose={() => setPreview(null)} />
      ) : null}
    </>
  );
}
