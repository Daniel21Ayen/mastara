// apps/admin-web/src/modules/catalog/screens/UniversitiesScreen.tsx
'use client';

import type { AdminUniversity } from '@mastara/contracts';
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
import { UniversityFormDialog } from '../components/UniversityFormDialog';
import { UniversityLogo } from '../components/UniversityLogo';
import { useUniversities } from '../hooks/useCatalog';
import { paginate } from '../lib/paginate';

import styles from './Catalog.module.css';

export function UniversitiesScreen() {
  const { data, error, loading, reload } = useUniversities();
  const [dialog, setDialog] = useState<{ university?: AdminUniversity } | null>(null);
  const [action, setAction] = useState<RowAction<AdminUniversity> | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const paged = paginate(data ?? [], page);

  const save = (row: AdminUniversity, status: CatalogStatus, reason?: string) =>
    catalogApi.updateUniversity(row.id, {
      name: row.name,
      shortName: row.shortName,
      status,
      ...(reason ? { reason } : {}),
    });

  async function toggle(row: AdminUniversity, next: CatalogStatus) {
    if (next === 'DRAFT') {
      setAction({ type: 'deactivate', row });
      return;
    }
    setProblem(null);
    try {
      await save(row, next);
      setNotice(adminText('admin.catalog.universities.saved', { name: row.shortName }));
      reload();
    } catch (cause) {
      setProblem(errorText(cause));
    }
  }

  const columns: Column<AdminUniversity>[] = [
    {
      key: 'name',
      header: adminText('admin.catalog.universities.name'),
      render: (row) => (
        <span className={styles.nameCell}>
          <UniversityLogo id={row.id} shortName={row.shortName} logoUrl={row.logoUrl} />
          <span>{row.name}</span>
        </span>
      ),
    },
    {
      key: 'short',
      header: adminText('admin.catalog.universities.shortName'),
      render: (row) => row.shortName,
    },
    {
      key: 'programs',
      header: adminText('admin.catalog.universities.programs'),
      render: (row) => row.programCount,
    },
    {
      key: 'status',
      header: adminText('admin.catalog.col.status'),
      render: (row) => (
        <ActiveSwitch status={row.status} name={row.shortName} onToggle={(next) => void toggle(row, next)} />
      ),
    },
    {
      key: 'actions',
      header: adminText('admin.catalog.col.actions'),
      render: (row) => (
        <RowButtons
          name={row.shortName}
          onEdit={() => setDialog({ university: row })}
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
          <Button onClick={() => setDialog({})}>
            {adminText('admin.catalog.universities.add')}
          </Button>
        }
      />
      <CatalogTabs current="universities" />
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
            caption={adminText('admin.catalog.universities.caption')}
            columns={columns}
            rows={paged.items}
            rowKey={(row) => row.id}
            empty={adminText('admin.catalog.universities.empty')}
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
        <UniversityFormDialog
          university={dialog.university}
          onSaved={(message) => {
            setNotice(message);
            reload();
          }}
          onClose={() => setDialog(null)}
        />
      ) : null}
      <RowDialogs
        action={action}
        nameOf={(row) => row.shortName}
        onDeactivate={async (row, reason) => {
          await save(row, 'DRAFT', reason);
          setNotice(adminText('admin.catalog.universities.saved', { name: row.shortName }));
          reload();
        }}
        onDelete={async (row) => {
          await catalogApi.deleteUniversity(row.id);
          setNotice(adminText('admin.catalog.deleted', { name: row.shortName }));
          reload();
        }}
        onClose={() => setAction(null)}
      />
    </>
  );
}
