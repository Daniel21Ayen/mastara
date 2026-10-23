// apps/admin-web/src/modules/questions/screens/ExamSetsListScreen.tsx
'use client';

import type { ExamQuestion, ExamSet } from '@mastara/contracts';
import { CATALOG_STATUSES, examSetSlug, needsCourse, SET_YEARS, STREAMS } from '@mastara/domain';
import type { CatalogStatus, ExamSetKind } from '@mastara/domain';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useMemo } from 'react';

import { adminText } from '@/core/i18n';
import { usePrograms, useUniversities } from '@/modules/scans';
import { QuestionPreviewDialog, StatusBadge } from '@/modules/tests';
import {
  Button,
  ButtonLink,
  Card,
  DataTable,
  Icon,
  PageHeader,
  Pagination,
  SelectField,
  StateMessage,
} from '@/shared/ui';
import type { Column } from '@/shared/ui';

import { BuildSetDialog } from '../components/BuildSetDialog';
import { BulkImportDialog } from '../components/BulkImportDialog';
import { SetReviewDialog } from '../components/SetReviewDialog';
import { yearText } from '../components/SetFields';
import { SetTabs } from '../components/SetTabs';
import { useExamSets } from '../hooks/useExamSets';
import { previewOf } from '../lib/examSetForm';
import { questionsApi } from '../api/questions.api';

import styles from '../components/Questions.module.css';


/** Exam Set Management: the sets of one kind, with Edit, Verify and View, and the top-bar search. */
export function ExamSetsListScreen({ kind }: { kind: ExamSetKind }) {
  const router = useRouter();
  const q = useSearchParams().get('q')?.trim() || undefined;
  const [status, setStatus] = useState<CatalogStatus | ''>('');
  const [university, setUniversity] = useState('');
  const [course, setCourse] = useState('');
  const [year, setYear] = useState('');
  const [stream, setStream] = useState('');
  const [program, setProgram] = useState('');
  const [page, setPage] = useState(1);
  const [building, setBuilding] = useState(false);
  const [bulkImportOpen, setBulkImportOpen] = useState(false);
  const [review, setReview] = useState<{ set: ExamSet; canChange: boolean } | null>(null);
  const [preview, setPreview] = useState<ExamQuestion | null>(null);


  const universities = useUniversities();
  const programs = usePrograms();

  const { data, error, loading, reload } = useExamSets({
    kind,
    status: status || undefined,
    q,
    page,
  });
  const slug = examSetSlug(kind);

  const columns: Column<ExamSet>[] = [
    {
      key: 'questionNumber',
      header: adminText('admin.questions.col.questionIds'),
      render: (row) => row.questions[0]?.id ?? row.id,
    },
    {
      key: 'question',
      header: adminText('admin.questions.col.question'),
      render: (row) => {
        const first = row.questions[0];
        const promptText = first?.prompt ?? '—';
        return (
          <div className={styles.questionCell}>
            <span
              className={styles.questionText}
              title={promptText}
              onClick={() => first && setPreview(first)}
              role={first ? 'button' : undefined}
              tabIndex={first ? 0 : undefined}
              onKeyDown={(e) => {
                if ((e.key === 'Enter' || e.key === ' ') && first) {
                  e.preventDefault();
                  setPreview(first);
                }
              }}
            >
              {promptText}
            </span>
            {row.questions.length > 1 ? (
              <span
                className={styles.questionMeta}
                title={`${row.questions.length} questions in this set`}
              >
                +{row.questions.length - 1}
              </span>
            ) : null}
          </div>
        );
      },
    },
    {
      key: 'university',
      header: adminText('admin.questions.col.university'),
      render: (row) => row.universityName,
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
            <Icon name="edit" size={14} />
            {adminText('admin.catalog.edit')}
          </ButtonLink>
          <Button
            aria-label={adminText('admin.questions.verifyNamed', { id: row.id })}
            onClick={() => setReview({ set: row, canChange: true })}
          >
            <Icon name="shieldCheck" size={14} />
            {adminText('admin.questions.verifyAction')}
          </Button>
          <Button
            variant="outline"
            aria-label={adminText('admin.questions.viewNamed', { id: row.id })}
            onClick={() => setReview({ set: row, canChange: false })}
          >
            <Icon name="eye" size={14} />
            {adminText('admin.questions.viewAction')}
          </Button>
          <Button
            variant="outline"
            title="Download CSV"
            aria-label={`Download CSV for ${row.id}`}
            onClick={() => questionsApi.downloadSet(row.id, 'csv')}
          >
            <Icon name="download" size={14} />
            CSV
          </Button>
          <Button
            variant="outline"
            title="Print Exam Paper / Save PDF"
            aria-label={`Print Exam Paper for ${row.id}`}
            onClick={() => questionsApi.downloadSet(row.id, 'html', { autoprint: true })}
          >
            <Icon name="printer" size={14} />
            Print
          </Button>
        </span>
      ),
    },

  ];

  const filteredRows = useMemo(() => {
    if (!data?.items) return [];
    return data.items.filter((row) => {
      if (university && row.universityId !== university) return false;
      if (course && row.courseId !== course) return false;
      if (year && String(row.year) !== year) return false;
      if (stream && row.stream !== stream) return false;
      if (program && row.programId !== program) return false;
      return true;
    });
  }, [data?.items, university, course, year, stream, program]);

  return (
    <>
      <PageHeader
        title={adminText('admin.questions.list.title')}
        actions={
          <>
            <Button variant="outline" onClick={() => setBulkImportOpen(true)}>
              <Icon name="upload" size={16} />
              {adminText('admin.questions.form.bulkImport')}
            </Button>

            <ButtonLink variant="outline" href={`/questions/${slug}/new`}>
              <Icon name="plus" size={16} />
              {adminText('admin.questions.newQuestion')}
            </ButtonLink>
            <Button onClick={() => setBuilding(true)}>
              <Icon name="grid" size={16} />
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
            <SelectField
              label={adminText('admin.questions.filter.university')}
              placeholder={adminText('admin.questions.filter.allUniversities')}
              options={(universities.data ?? []).map((u) => ({ value: u.id, label: u.shortName }))}
              value={university}
              onChange={(event) => { setUniversity(event.target.value); setPage(1); }}
            />
            <SelectField
              label={adminText('admin.questions.filter.course')}
              placeholder={adminText('admin.questions.filter.allCourses')}
              options={
                data
                  ? Array.from(
                      new Map(
                        data.items
                          .filter((row) => row.courseTitle)
                          .map((row) => [row.courseId, row.courseTitle!])
                      ).entries()
                    ).map(([value, label]) => ({ value: value!, label }))
                  : []
              }
              value={course}
              onChange={(event) => { setCourse(event.target.value); setPage(1); }}
            />
            <SelectField
              label={adminText('admin.questions.filter.year')}
              placeholder={adminText('admin.questions.filter.allYears')}
              options={SET_YEARS.map((y) => ({ value: String(y), label: yearText(y) }))}
              value={year}
              onChange={(event) => { setYear(event.target.value); setPage(1); }}
            />
            <SelectField
              label={adminText('admin.questions.filter.stream')}
              placeholder={adminText('admin.questions.filter.allStreams')}
              options={STREAMS.map((value) => ({
                value,
                label: adminText(`admin.stream.${value}`),
              }))}
              value={stream}
              onChange={(event) => { setStream(event.target.value); setPage(1); }}
            />
            <SelectField
              label={adminText('admin.questions.filter.program')}
              placeholder={adminText('admin.questions.filter.allPrograms')}
              options={(programs.data ?? []).map((p) => ({ value: p.id, label: p.name }))}
              value={program}
              onChange={(event) => { setProgram(event.target.value); setPage(1); }}
            />
          </div>
          <div className={styles.compact}>
            <DataTable
              caption={adminText('admin.questions.list.caption', {
                kind: adminText(`admin.questions.kind.${kind}`),
              })}
              columns={columns}
              rows={filteredRows}
              rowKey={(row) => row.id}
              empty={adminText('admin.questions.list.empty')}
            />
          </div>
          {data.total > 0 ? (
            <Pagination
              page={data.page}
              pageCount={data.pageCount}
              shown={filteredRows.length}
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
      {bulkImportOpen ? (
        <BulkImportDialog
          isOpen={bulkImportOpen}
          onClose={() => setBulkImportOpen(false)}
          onImport={(importedQuestions) => {
            if (typeof window !== 'undefined') {
              sessionStorage.setItem('mastara_staged_import', JSON.stringify(importedQuestions));
              router.push(`/questions/${slug}/new`);
            }
          }}
          currentCount={0}
          defaultTopic={kind === 'COC' ? 'COC Question' : 'General'}
        />
      ) : null}
    </>
  );
}

