// apps/admin-web/src/modules/scans/screens/ScansListScreen.tsx
'use client';

import type { AdminScan } from '@mastara/contracts';
import { SCAN_KINDS } from '@mastara/domain';
import type { ScanKind } from '@mastara/domain';
import { useState } from 'react';

import { agoText } from '@/core/format';
import { adminText } from '@/core/i18n';
import {
  Button,
  ButtonLink,
  Card,
  DataTable,
  PageHeader,
  Pagination,
  SelectField,
  StateMessage,
  TextField,
} from '@/shared/ui';
import type { Column } from '@/shared/ui';

import { ScanDetailsDialog } from '../components/ScanDetailsDialog';
import { useScans } from '../hooks/useScans';
import { scanTypeText, scanWhere } from '../lib/scanText';

import styles from '../components/Scans.module.css';

/** Scan to PDF: the saved scans, with a filter by document type, and a button to add one. */
export function ScansListScreen() {
  const [kind, setKind] = useState<ScanKind | ''>('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState<AdminScan | null>(null);

  const { data, error, loading, reload } = useScans({
    kind: kind || undefined,
    q: q.trim() || undefined,
    page,
  });

  const columns: Column<AdminScan>[] = [
    { key: 'id', header: adminText('admin.scans.col.id'), render: (row) => row.id },
    { key: 'type', header: adminText('admin.scans.col.type'), render: (row) => scanTypeText(row) },
    {
      key: 'where',
      header: adminText('admin.scans.col.where'),
      render: (row) => (row.title ? `${row.title} · ${scanWhere(row)}` : scanWhere(row)),
    },
    {
      key: 'set',
      header: adminText('admin.scans.col.examSet'),
      render: (row) => row.examSetId ?? '—',
    },
    { key: 'pages', header: adminText('admin.scans.col.pages'), render: (row) => row.pages.length },
    {
      key: 'answers',
      header: adminText('admin.scans.col.answers'),
      render: (row) => row.answers.length,
    },
    {
      key: 'added',
      header: adminText('admin.scans.col.added'),
      render: (row) => agoText(row.createdAt),
    },
    {
      key: 'open',
      header: adminText('admin.scans.col.open'),
      render: (row) => (
        <button
          type="button"
          className={styles.edit}
          aria-label={adminText('admin.scans.openNamed', { id: row.id })}
          onClick={() => setOpen(row)}
        >
          {adminText('admin.scans.view')}
        </button>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title={adminText('admin.nav.scanToPdf')}
        subtitle={adminText('admin.scans.subtitle')}
        actions={<ButtonLink href="/scan-to-pdf/new">{adminText('admin.scans.new')}</ButtonLink>}
      />

      {error ? (
        <StateMessage tone="alert">
          <span>{adminText('admin.scans.error')}</span>
          <Button variant="outline" onClick={reload}>
            {adminText('admin.common.retry')}
          </Button>
        </StateMessage>
      ) : null}
      {loading && !data ? <StateMessage>{adminText('admin.common.loading')}</StateMessage> : null}

      {data ? (
        <Card>
          <div className={styles.toolbar}>
            <TextField
              label={adminText('admin.scans.search')}
              placeholder={adminText('admin.scans.searchPlaceholder')}
              autoComplete="off"
              value={q}
              onChange={(event) => {
                setQ(event.target.value);
                setPage(1);
              }}
            />
            <SelectField
              label={adminText('admin.scans.document.type')}
              placeholder={adminText('admin.scans.allTypes')}
              options={SCAN_KINDS.map((value) => ({
                value,
                label: adminText(`admin.scans.kind.${value}`),
              }))}
              value={kind}
              onChange={(event) => {
                setKind(event.target.value as ScanKind | '');
                setPage(1);
              }}
            />
          </div>
          <DataTable
            caption={adminText('admin.scans.caption')}
            columns={columns}
            rows={data.items}
            rowKey={(row) => row.id}
            empty={adminText('admin.scans.empty')}
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

      {open ? <ScanDetailsDialog scan={open} onClose={() => setOpen(null)} /> : null}
    </>
  );
}
