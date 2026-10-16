// apps/admin-web/src/modules/catalog/screens/ProgramsScreen.tsx
'use client';

import type { AdminProgram } from '@mastara/contracts';
import type { CatalogStatus } from '@mastara/domain';
import { useState } from 'react';

import { adminText, errorText } from '@/core/i18n';
import { Button, Card, DataTable, PageHeader, Pagination, StateMessage } from '@/shared/ui';
import type { Column } from '@/shared/ui';

import { catalogApi } from '../api/catalog.api';
import { CatalogTabs } from '../components/CatalogTabs';
import { ProgramFormDialog } from '../components/ProgramFormDialog';
import { ActiveSwitch, RowButtons } from '../components/RowActions';
import { RowDialogs } from '../components/RowDialogs';
import type { RowAction } from '../components/RowDialogs';
import { UniversityLogo } from '../components/UniversityLogo';
import { usePrograms } from '../hooks/useCatalog';
import { paginate } from '../lib/paginate';

import styles from './Catalog.module.css';

export function ProgramsScreen() {
  const { data, error, loading, reload } = usePrograms();
  const [dialog, setDialog] = useState<{ program?: AdminProgram } | null>(null);
  const [action, setAction] = useState<RowAction<AdminProgram> | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const paged = paginate(data ?? [], page);

  const save = (row: AdminProgram, status: CatalogStatus, reason?: string) =>
    catalogApi.updateProgram(row.id, {
      universityId: row.universityId,
      name: row.name,
      status,
      ...(reason ? { reason } : {}),
    });

  async function toggle(row: AdminProgram, next: CatalogStatus) {
    if (next === 'DRAFT') {
      setAction({ type: 'deactivate', row });
      return;
    }
    setProblem(null);
    try {
      await save(row, next);
      setNotice(adminText('admin.catalog.programs.saved', { name: row.name }));
      reload();
    } catch (cause) {
      setProblem(errorText(cause));
    }
  }

  const columns: Column<AdminProgram>[] = [
    { key: 'name', header: adminText('admin.catalog.programs.name'), render: (row) => row.name },
    {
      key: 'university',
      header: adminText('admin.catalog.form.university'),
      render: (row) => (
        <span className={styles.nameCell}>
          <UniversityLogo id={row.universityId} shortName={row.universityShortName} size={32} />
          <span>{row.universityShortName}</span>
        </span>
      ),
    },
    {
      key: 'courses',
      header: adminText('admin.catalog.programs.courses'),
      render: (row) => row.courseCount,
    },
    {
      key: 'status',
      header: adminText('admin.catalog.col.status'),
      render: (row) => (
        <ActiveSwitch status={row.status} name={row.name} onToggle={(next) => void toggle(row, next)} />
      ),
    },
    {
      key: 'actions',
      header: adminText('admin.catalog.col.actions'),
      render: (row) => (
        <RowButtons
          name={row.name}
          onEdit={() => setDialog({ program: row })}
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
          <Button onClick={() => setDialog({})}>{adminText('admin.catalog.programs.add')}</Button>
        }
      />
      <CatalogTabs current="programs" />
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
            caption={adminText('admin.catalog.programs.caption')}
            columns={columns}
            rows={paged.items}
            rowKey={(row) => row.id}
            empty={adminText('admin.catalog.programs.empty')}
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
      {dialog ? (
        <ProgramFormDialog
          program={dialog.program}
          onSaved={(message) => {
            setNotice(message);
            reload();
          }}
          onClose={() => setDialog(null)}
        />
      ) : null}
      <RowDialogs
        action={action}
        nameOf={(row) => row.name}
        onDeactivate={async (row, reason) => {
          await save(row, 'DRAFT', reason);
          setNotice(adminText('admin.catalog.programs.saved', { name: row.name }));
          reload();
        }}
        onDelete={async (row) => {
          await catalogApi.deleteProgram(row.id);
          setNotice(adminText('admin.catalog.deleted', { name: row.name }));
          reload();
        }}
        onClose={() => setAction(null)}
      />
    </>
  );
}
