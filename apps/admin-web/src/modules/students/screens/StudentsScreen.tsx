// apps/admin-web/src/modules/students/screens/StudentsScreen.tsx
'use client';

import type { StudentSummary } from '@mastara/contracts';
import { STUDENT_ACCESS_STATES, STUDENT_STREAMS } from '@mastara/domain';
import type { StudentAccessState, StudentStream } from '@mastara/domain';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';

import { adminText } from '@/core/i18n';
import {
  Button,
  Card,
  DataTable,
  PageHeader,
  Pagination,
  SelectField,
  StateMessage,
} from '@/shared/ui';
import type { Column } from '@/shared/ui';

import { AddStudentDialog } from '../components/AddStudentDialog';
import { AccessBadge, DeviceBadge } from '../components/StatusBadges';
import { useStudentOptions, useStudents } from '../hooks/useStudents';

import styles from './StudentsScreen.module.css';

export function StudentsScreen() {
  const router = useRouter();
  const q = useSearchParams().get('q')?.trim() || undefined;

  const [universityId, setUniversityId] = useState('');
  const [stream, setStream] = useState<StudentStream | ''>('');
  const [access, setAccess] = useState<StudentAccessState | ''>('');
  const [page, setPage] = useState(1);
  const [adding, setAdding] = useState(false);

  const options = useStudentOptions();
  const { data, error, loading, reload } = useStudents({
    q,
    universityId: universityId || undefined,
    stream: stream || undefined,
    access: access || undefined,
    page,
  });

  const columns: Column<StudentSummary>[] = [
    {
      key: 'id',
      header: adminText('admin.students.col.id'),
      render: (row) =>
        row.studentCode ? (
          <span
            style={{
              fontFamily: 'monospace',
              fontWeight: 700,
              color: 'var(--color-primary, #2563eb)',
              letterSpacing: '0.025em',
            }}
          >
            {row.studentCode}
          </span>
        ) : (
          <span style={{ color: 'var(--color-text-muted, #94a3b8)', fontStyle: 'italic' }}>
            —
          </span>
        ),
    },
    { key: 'name', header: adminText('admin.students.col.name'), render: (row) => row.name },
    {
      key: 'university',
      header: adminText('admin.students.col.university'),
      render: (row) => row.universityShortName,
    },
    {
      key: 'stream',
      header: adminText('admin.students.col.stream'),
      render: (row) => adminText(`admin.stream.${row.stream}`),
    },
    {
      key: 'courses',
      header: adminText('admin.students.col.courses'),
      render: (row) => row.courseCount,
    },
    {
      key: 'device',
      header: adminText('admin.students.col.device'),
      render: (row) => <DeviceBadge device={row.device} />,
    },
    {
      key: 'access',
      header: adminText('admin.students.col.access'),
      render: (row) => <AccessBadge access={row.access} />,
    },
    {
      key: 'actions',
      header: adminText('admin.students.col.actions'),
      render: (row) => (
        <Link
          href={`/students/${row.id}`}
          className={styles.view}
          aria-label={adminText('admin.students.viewNamed', { name: row.name })}
        >
          {adminText('admin.students.view')}
        </Link>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title={adminText('admin.students.title')}
        actions={
          <>
            <SelectField
              hideLabel
              label={adminText('admin.students.filter.university')}
              placeholder={adminText('admin.students.filter.allUniversities')}
              options={(options.data?.universities ?? []).map((item) => ({
                value: item.id,
                label: item.shortName,
              }))}
              value={universityId}
              onChange={(event) => {
                setUniversityId(event.target.value);
                setPage(1);
              }}
            />
            <SelectField
              hideLabel
              label={adminText('admin.students.filter.stream')}
              placeholder={adminText('admin.students.filter.allStreams')}
              options={STUDENT_STREAMS.map((value) => ({
                value,
                label: adminText(`admin.stream.${value}`),
              }))}
              value={stream}
              onChange={(event) => {
                setStream(event.target.value as StudentStream | '');
                setPage(1);
              }}
            />
            <SelectField
              hideLabel
              label={adminText('admin.students.filter.access')}
              placeholder={adminText('admin.students.filter.allAccess')}
              options={STUDENT_ACCESS_STATES.map((value) => ({
                value,
                label: adminText(`admin.access.${value}`),
              }))}
              value={access}
              onChange={(event) => {
                setAccess(event.target.value as StudentAccessState | '');
                setPage(1);
              }}
            />
            <Button onClick={() => setAdding(true)}>{adminText('admin.students.add')}</Button>
          </>
        }
      />

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.75rem',
          padding: '0.875rem 1.25rem',
          marginBottom: '1.25rem',
          borderRadius: '8px',
          background: 'var(--color-surface, #ffffff)',
          border: '1px solid var(--color-border, #e2e8f0)',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, minWidth: '280px' }}>
          <span style={{ fontSize: '1.25rem' }}>🎓</span>
          <div style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary, #475569)', lineHeight: 1.45 }}>
            <strong style={{ color: 'var(--color-text-primary, #0f172a)' }}>
              Registration & Student ID Policy:
            </strong>{' '}
            Students accessing free content do not need to register. Student accounts and official sequential IDs (
            <code style={{ fontWeight: 700, color: 'var(--color-primary, #2563eb)', background: '#eff6ff', padding: '2px 5px', borderRadius: '4px' }}>
              MS0001+
            </code>
            ) are automatically assigned once students purchase locked courses.
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span
            style={{
              fontSize: '0.75rem',
              fontWeight: 600,
              padding: '0.25rem 0.625rem',
              borderRadius: '9999px',
              background: '#ecfdf5',
              color: '#059669',
              border: '1px solid #a7f3d0',
            }}
          >
            Auto-Increment: MS0001
          </span>
          <span
            style={{
              fontSize: '0.75rem',
              fontWeight: 600,
              padding: '0.25rem 0.625rem',
              borderRadius: '9999px',
              background: '#eff6ff',
              color: '#2563eb',
              border: '1px solid #bfdbfe',
            }}
          >
            Registered via Locked Courses
          </span>
        </div>
      </div>

      {q ? (
        <p className={styles.search}>
          <span>{adminText('admin.students.searchResult', { q })}</span>
          <button type="button" className={styles.clear} onClick={() => router.push('/students')}>
            {adminText('admin.students.clearSearch')}
          </button>
        </p>
      ) : null}

      {error ? (
        <StateMessage tone="alert">
          <span>{adminText('admin.students.error')}</span>
          <Button variant="outline" onClick={reload}>
            {adminText('admin.common.retry')}
          </Button>
        </StateMessage>
      ) : null}

      {loading && !data ? <StateMessage>{adminText('admin.common.loading')}</StateMessage> : null}

      {data ? (
        <Card>
          <DataTable
            caption={adminText('admin.students.caption')}
            columns={columns}
            rows={data.items}
            rowKey={(row) => row.id}
            empty={adminText('admin.students.empty')}
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

      {adding ? (
        <AddStudentDialog
          onClose={() => setAdding(false)}
          onCreated={(student) => router.push(`/students/${student.id}`)}
        />
      ) : null}
    </>
  );
}
