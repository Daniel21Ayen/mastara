// apps/admin-web/src/modules/catalog/screens/SemestersScreen.tsx
'use client';

import type { AdminSemester } from '@mastara/contracts';
import type { CatalogStatus } from '@mastara/domain';
import { useState } from 'react';

import { adminText, errorText } from '@/core/i18n';
import { Button, Card, DataTable, PageHeader, Pagination, StateMessage } from '@/shared/ui';
import type { Column } from '@/shared/ui';

import { catalogApi } from '../api/catalog.api';
import { CatalogTabs } from '../components/CatalogTabs';
import { ActiveSwitch, RowButtons } from '../components/RowActions';
import { RowDialogs } from '../components/RowDialogs';
import type { RowAction } from '../components/RowDialogs';
import { useSemesters } from '../hooks/useCatalog';
import { paginate } from '../lib/paginate';

import styles from './Catalog.module.css';

const nameOf = (row: AdminSemester): string =>
  adminText('admin.catalog.semesters.rowName', {
    n: row.number,
    program: row.programName,
    university: row.universityShortName,
  });

/** Semesters are created with their program. They can be switched on or off and deleted while empty. */
export function SemestersScreen() {
  const { data, error, loading, reload } = useSemesters();
  const [action, setAction] = useState<RowAction<AdminSemester> | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const paged = paginate(data ?? [], page);

  const save = (row: AdminSemester, status: CatalogStatus, reason?: string) =>
    catalogApi.updateSemester(row.id, { status, ...(reason ? { reason } : {}) });

  async function toggle(row: AdminSemester, next: CatalogStatus) {
    if (next === 'DRAFT') {
      setAction({ type: 'deactivate', row });
      return;
    }
    setProblem(null);
    try {
      await save(row, next);
      setNotice(adminText('admin.catalog.semesters.saved', { name: nameOf(row) }));
      reload();
    } catch (cause) {
      setProblem(errorText(cause));
    }
  }

  const columns: Column<AdminSemester>[] = [
    {
      key: 'university',
      header: adminText('admin.catalog.form.university'),
      render: (row) => row.universityShortName,
    },
    {
      key: 'program',
      header: adminText('admin.catalog.form.program'),
      render: (row) => row.programName,
    },
    {
      key: 'semester',
      header: adminText('admin.catalog.courses.semester'),
      render: (row) => row.number,
    },
    {
      key: 'courses',
      header: adminText('admin.catalog.programs.courses'),
      render: (row) => row.courseCount,
    },
    {
      key: 'published',
      header: adminText('admin.catalog.semesters.published'),
      render: (row) => row.publishedCourseCount,
    },
    {
      key: 'status',
      header: adminText('admin.catalog.col.status'),
      render: (row) => (
        <ActiveSwitch status={row.status} name={nameOf(row)} onToggle={(next) => void toggle(row, next)} />
      ),
    },
    {
      key: 'actions',
      header: adminText('admin.catalog.col.actions'),
      render: (row) => (
        <RowButtons name={nameOf(row)} onDelete={() => setAction({ type: 'delete', row })} />
      ),
    },
  ];

  return (
    <>
      <PageHeader title={adminText('admin.catalog.title')} />
      <CatalogTabs current="semesters" />
      <p>{adminText('admin.catalog.semesters.note')}</p>
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
          <DataTable
            caption={adminText('admin.catalog.semesters.caption')}
            columns={columns}
            rows={paged.items}
            rowKey={(row) => row.id}
            empty={adminText('admin.catalog.semesters.empty')}
          />
          {paged.total > 0 ? (
            <Pagination
              page={paged.page}
              pageCount={paged.pageCount}
              shown={paged.items.length}
              total={paged.total}
              onPage={setPage}
            />
          ) : null}
        </Card>
      ) : null}
      <RowDialogs
        action={action}
        nameOf={nameOf}
        onDeactivate={async (row, reason) => {
          await save(row, 'DRAFT', reason);
          setNotice(adminText('admin.catalog.semesters.saved', { name: nameOf(row) }));
          reload();
        }}
        onDelete={async (row) => {
          await catalogApi.deleteSemester(row.id);
          setNotice(adminText('admin.catalog.deleted', { name: nameOf(row) }));
          reload();
        }}
        onClose={() => setAction(null)}
      />
    </>
  );
}
