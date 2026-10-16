// apps/admin-web/src/modules/tests/screens/TestListScreen.tsx
'use client';

import type { AdminQuestion } from '@mastara/contracts';
import { CATALOG_STATUSES, QUESTION_FORMS, quizSlug } from '@mastara/domain';
import type { CatalogStatus, QuestionForm, QuizNumber } from '@mastara/domain';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useState } from 'react';

import { adminText } from '@/core/i18n';
import { useContentCourse } from '@/modules/content';
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

import { QuizTabs } from '../components/QuizTabs';
import { StatusBadge } from '../components/StatusBadge';
import { useQuestions } from '../hooks/useTests';

import styles from './Tests.module.css';

/** Test Management: the questions of one quiz across courses, with filters and the top-bar search. */
export function TestListScreen({ quizNo }: { quizNo: QuizNumber }) {
  const q = useSearchParams().get('q')?.trim() || undefined;
  const { courses, setCourseId } = useContentCourse();
  const [courseId, setFilterCourse] = useState('');
  const [form, setForm] = useState<QuestionForm | ''>('');
  const [status, setStatus] = useState<CatalogStatus | ''>('');
  const [page, setPage] = useState(1);

  const { data, error, loading, reload } = useQuestions({
    quizNo,
    courseId: courseId || undefined,
    form: form || undefined,
    status: status || undefined,
    q,
    page,
  });

  const filter = <T,>(set: (value: T) => void, value: T) => {
    set(value);
    setPage(1);
  };

  const columns: Column<AdminQuestion>[] = [
    { key: 'id', header: adminText('admin.tests.col.id'), render: (row) => row.id },
    {
      key: 'question',
      header: adminText('admin.tests.col.question'),
      render: (row) => <span className={styles.questionText}>{row.title}</span>,
    },
    { key: 'course', header: adminText('admin.tests.col.course'), render: (row) => row.courseCode },
    {
      key: 'type',
      header: adminText('admin.tests.col.type'),
      render: (row) => adminText(`admin.tests.type.${row.form}`),
    },
    { key: 'topic', header: adminText('admin.tests.col.topic'), render: (row) => row.topicLabel },
    {
      key: 'status',
      header: adminText('admin.tests.col.status'),
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: 'edit',
      header: adminText('admin.tests.col.edit'),
      render: (row) => (
        <Link
          className={styles.edit}
          href={`/content/tests/${quizSlug(quizNo)}/${row.id}`}
          aria-label={adminText('admin.tests.editNamed', { id: row.id })}
        >
          {adminText('admin.catalog.edit')}
        </Link>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title={adminText('admin.tests.list.title')}
        subtitle={adminText('admin.tests.list.subtitle')}
        actions={
          <ButtonLink
            href={`/content/tests/${quizSlug(quizNo)}/new`}
            onClick={() => courseId && setCourseId(courseId)}
          >
            {adminText('admin.tests.list.add')}
          </ButtonLink>
        }
      />
      <QuizTabs current={quizNo} />

      {error ? (
        <StateMessage tone="alert">
          <span>{adminText('admin.tests.error')}</span>
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
              label={adminText('admin.tests.filter.course')}
              placeholder={adminText('admin.tests.filter.allCourses')}
              options={courses.map((item) => ({
                value: item.id,
                label: `${item.code} · ${item.title}`,
              }))}
              value={courseId}
              onChange={(event) => filter(setFilterCourse, event.target.value)}
            />
            <SelectField
              label={adminText('admin.tests.filter.type')}
              placeholder={adminText('admin.tests.filter.allTypes')}
              options={QUESTION_FORMS.map((value) => ({
                value,
                label: adminText(`admin.tests.type.${value}`),
              }))}
              value={form}
              onChange={(event) => filter(setForm, event.target.value as QuestionForm | '')}
            />
            <SelectField
              label={adminText('admin.catalog.filter.status')}
              placeholder={adminText('admin.catalog.filter.allStatuses')}
              options={CATALOG_STATUSES.map((value) => ({
                value,
                label: adminText(`admin.catalog.status.${value}`),
              }))}
              value={status}
              onChange={(event) => filter(setStatus, event.target.value as CatalogStatus | '')}
            />
          </div>
          <DataTable
            caption={adminText('admin.tests.list.caption', { n: quizNo })}
            columns={columns}
            rows={data.items}
            rowKey={(row) => row.id}
            empty={adminText('admin.tests.list.empty')}
          />
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
    </>
  );
}
