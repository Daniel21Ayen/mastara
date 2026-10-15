// apps/admin-web/src/modules/catalog/screens/CoursesScreen.tsx
'use client';

import type { AdminCourse } from '@mastara/contracts';
import { ALL_UNIVERSITIES, STREAMS } from '@mastara/domain';
import type { CatalogStatus, Stream } from '@mastara/domain';
import { CATALOG_STATUSES } from '@mastara/domain';
import { useState } from 'react';

import { adminText, errorText } from '@/core/i18n';
import {
  Button,
  Card,
  DataTable,
  PageHeader,
  Pagination,
  SelectField,
  StateMessage,
  TextField,
} from '@/shared/ui';
import type { Column } from '@/shared/ui';

import { catalogApi } from '../api/catalog.api';
import { CatalogTabs } from '../components/CatalogTabs';
import { CourseFormDialog } from '../components/CourseFormDialog';
import { ActiveSwitch, RowButtons } from '../components/RowActions';
import { RowDialogs } from '../components/RowDialogs';
import type { RowAction } from '../components/RowDialogs';
import { UniversityLogo } from '../components/UniversityLogo';
import { usePrograms, useCourses, useUniversities } from '../hooks/useCatalog';

import styles from './Catalog.module.css';

type Semester = '' | '1' | '2';

export function CoursesScreen() {
  const [q, setQ] = useState('');
  const [universityId, setUniversityId] = useState('');
  const [programId, setProgramId] = useState('');
  const [semester, setSemester] = useState<Semester>('');
  const [stream, setStream] = useState<Stream | ''>('');
  const [status, setStatus] = useState<CatalogStatus | ''>('');
  const [page, setPage] = useState(1);
  const [dialog, setDialog] = useState<{ course?: AdminCourse } | null>(null);
  const [action, setAction] = useState<RowAction<AdminCourse> | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [problem, setProblem] = useState<string | null>(null);

  const universities = useUniversities();
  const programs = usePrograms();
  const { data, error, loading, reload } = useCourses({
    q: q.trim() || undefined,
    universityId: universityId || undefined,
    programId: programId || undefined,
    semesterNumber: semester === '' ? undefined : semester === '1' ? 1 : 2,
    stream: stream || undefined,
    status: status || undefined,
    page,
  });

  const filter = <T,>(set: (value: T) => void, value: T) => {
    set(value);
    setPage(1);
  };

  const save = (row: AdminCourse, next: CatalogStatus, reason?: string) =>
    catalogApi.updateCourse(row.id, {
      code: row.code,
      title: row.title,
      stream: row.stream,
      freeTrialItems: row.freeTrialItems,
      status: next,
      ...(reason ? { reason } : {}),
    });

  async function toggle(row: AdminCourse, next: CatalogStatus) {
    if (next === 'DRAFT') {
      setAction({ type: 'deactivate', row });
      return;
    }
    setProblem(null);
    try {
      await save(row, next);
      setNotice(adminText('admin.catalog.courses.saved', { code: row.code }));
      reload();
    } catch (cause) {
      setProblem(errorText(cause));
    }
  }

  const columns: Column<AdminCourse>[] = [
    { key: 'code', header: adminText('admin.catalog.courses.code'), render: (row) => row.code },
    {
      key: 'title',
      header: adminText('admin.catalog.courses.titleField'),
      render: (row) => row.title,
    },
    {
      key: 'program',
      header: adminText('admin.catalog.courses.program'),
      render: (row) =>
        row.programId === null ? (
          <span className={styles.nameCell}>
            <UniversityLogo id={row.universityId} shortName={row.universityShortName} size={32} />
            <span>{adminText('admin.catalog.courses.allUniversities')}</span>
          </span>
        ) : (
          <span className={styles.nameCell}>
            <UniversityLogo id={row.universityId} shortName={row.universityShortName} size={32} />
            <span>{`${row.programName ?? ''} · ${row.universityShortName}`}</span>
          </span>
        ),
    },
    {
      key: 'semester',
      header: adminText('admin.catalog.courses.semester'),
      render: (row) => row.semesterNumber,
    },
    {
      key: 'stream',
      header: adminText('admin.catalog.courses.stream'),
      render: (row) => adminText(`admin.stream.${row.stream}`),
    },
    {
      key: 'trial',
      header: adminText('admin.catalog.courses.freeTrial'),
      render: (row) =>
        row.freeTrialItems > 0 ? (
          adminText('admin.catalog.courses.freeTrialItems', { count: row.freeTrialItems })
        ) : (
          <span className={styles.muted}>{adminText('admin.common.none')}</span>
        ),
    },
    {
      key: 'status',
      header: adminText('admin.catalog.col.status'),
      render: (row) => (
        <ActiveSwitch status={row.status} name={row.code} onToggle={(next) => void toggle(row, next)} />
      ),
    },
    {
      key: 'actions',
      header: adminText('admin.catalog.col.actions'),
      render: (row) => (
        <RowButtons
          name={row.code}
          onEdit={() => setDialog({ course: row })}
          onDelete={() => setAction({ type: 'delete', row })}
        />
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title={adminText('admin.catalog.title')}
        actions={
          <Button onClick={() => setDialog({})}>{adminText('admin.catalog.courses.add')}</Button>
        }
      />
      <CatalogTabs current="courses" />

      {notice ? (
        <div className={styles.notice}>
          <StateMessage>{notice}</StateMessage>
        </div>
      ) : null}

      {problem ? (
        <div className={styles.notice}>
          <StateMessage tone="alert">{problem}</StateMessage>
        </div>
      ) : null}

      {error ? (
        <StateMessage tone="alert">
          <span>{adminText('admin.catalog.error')}</span>
          <Button variant="outline" onClick={reload}>
            {adminText('admin.common.retry')}
          </Button>
        </StateMessage>
      ) : null}
      {loading && !data ? <StateMessage>{adminText('admin.common.loading')}</StateMessage> : null}

      {data ? (
        <Card>
          <div className={styles.toolbar}>
            <div className={styles.search}>
              <TextField
                label={adminText('admin.catalog.courses.search')}
                placeholder={adminText('admin.catalog.courses.searchPlaceholder')}
                autoComplete="off"
                value={q}
                onChange={(event) => filter(setQ, event.target.value)}
              />
            </div>
            <SelectField
              label={adminText('admin.catalog.filter.university')}
              placeholder={adminText('admin.catalog.filter.allUniversities')}
              options={[
                { value: ALL_UNIVERSITIES, label: adminText('admin.catalog.form.allUniversities') },
                ...(universities.data ?? []).map((item) => ({
                  value: item.id,
                  label: item.shortName,
                })),
              ]}
              value={universityId}
              onChange={(event) => {
                setUniversityId(event.target.value);
                setProgramId('');
                setPage(1);
              }}
            />
            <SelectField
              label={adminText('admin.catalog.filter.program')}
              placeholder={adminText('admin.catalog.filter.allPrograms')}
              options={(programs.data ?? [])
                .filter((item) => !universityId || item.universityId === universityId)
                .map((item) => ({
                  value: item.id,
                  label: universityId ? item.name : `${item.name} · ${item.universityShortName}`,
                }))}
              value={programId}
              onChange={(event) => filter(setProgramId, event.target.value)}
            />
            <SelectField
              label={adminText('admin.catalog.filter.semester')}
              placeholder={adminText('admin.catalog.filter.allSemesters')}
              options={[
                { value: '1', label: adminText('admin.catalog.form.semesterOption', { n: 1 }) },
                { value: '2', label: adminText('admin.catalog.form.semesterOption', { n: 2 }) },
              ]}
              value={semester}
              onChange={(event) => filter(setSemester, event.target.value as Semester)}
            />
            <SelectField
              label={adminText('admin.catalog.filter.stream')}
              placeholder={adminText('admin.catalog.filter.allStreams')}
              options={STREAMS.map((value) => ({
                value,
                label: adminText(`admin.stream.${value}`),
              }))}
              value={stream}
              onChange={(event) => filter(setStream, event.target.value as Stream | '')}
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
            caption={adminText('admin.catalog.courses.caption')}
            columns={columns}
            rows={data.items}
            rowKey={(row) => row.id}
            empty={adminText('admin.catalog.courses.empty')}
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

      <RowDialogs
        action={action}
        nameOf={(row) => row.code}
        onDeactivate={async (row, reason) => {
          await save(row, 'DRAFT', reason);
          setNotice(adminText('admin.catalog.courses.saved', { code: row.code }));
          reload();
        }}
        onDelete={async (row) => {
          await catalogApi.deleteCourse(row.id);
          setNotice(adminText('admin.catalog.deleted', { name: row.code }));
          reload();
        }}
        onClose={() => setAction(null)}
      />

      {dialog ? (
        <CourseFormDialog
          course={dialog.course}
          onSaved={(message) => {
            setNotice(message);
            reload();
          }}
          onClose={() => setDialog(null)}
        />
      ) : null}
    </>
  );
}
