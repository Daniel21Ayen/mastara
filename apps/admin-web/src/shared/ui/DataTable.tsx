// apps/admin-web/src/shared/ui/DataTable.tsx
'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import { Pagination } from './Pagination';
import styles from './DataTable.module.css';

export interface Column<Row> {
  key: string;
  header: string;
  render: (row: Row) => ReactNode;
  /** Right-align numbers. */
  align?: 'start' | 'end';
}

export interface DataTablePaginationProps {
  /** Current 1-indexed page. If not specified, reads from URL query ?page= or default 1. */
  page?: number;
  /** Total count of items across all pages. */
  total?: number;
  /** Number of items per page. Defaults to 10. */
  pageSize?: number;
  /** Total number of pages. Computed from total / pageSize if not passed. */
  pageCount?: number;
  /** Callback fired when page changes. */
  onPageChange?: (page: number) => void;
  /** Alias for onPageChange for backwards compatibility with Pagination component. */
  onPage?: (page: number) => void;
  /** Automatically sync page number with Next.js router query param ?page=. Defaults to true. */
  syncUrl?: boolean;
}

export interface DataTableProps<Row> {
  /** Names the table for screen readers; not shown. */
  caption: string;
  columns: readonly Column<Row>[];
  rows: readonly Row[];
  rowKey: (row: Row) => string;
  /** Shown instead of the body when there are no rows. */
  empty?: string;
  /** Integrated pagination options */
  pagination?: DataTablePaginationProps;
  /** Direct pagination props for convenience */
  page?: number;
  pageCount?: number;
  total?: number;
  pageSize?: number;
  onPage?: (page: number) => void;
  onPageChange?: (page: number) => void;
  /** Dependency key to reset to page 1 when search or filter values change */
  filterKey?: any;
  /** Optional custom title or total label to show in table header. */
  totalLabel?: string;
}

/**
 * Universal accessible Admin DataTable.
 * Features:
 * - Built-in URL query parameter synchronization (?page=)
 * - Automatic reset to page 1 on filter changes
 * - Automatic step-back one page if deletion empties the current page
 * - Total items count badge
 * - Fully accessible responsive horizontal scroll
 */
export function DataTable<Row>({
  caption,
  columns,
  rows,
  rowKey,
  empty,
  pagination: paginationProp,
  page: directPage,
  pageCount: directPageCount,
  total: directTotal,
  pageSize: directPageSize,
  onPage: directOnPage,
  onPageChange: directOnPageChange,
  filterKey,
  totalLabel,
}: DataTableProps<Row>) {
  let router: any = null;
  let searchParams: any = null;
  let pathname: string = '';

  try {
    router = useRouter();
    searchParams = useSearchParams();
    pathname = usePathname();
  } catch {
    // Graceful fallback if rendered outside Next.js navigation context (e.g. tests)
  }

  // Merge direct props into pagination options
  const pagination: DataTablePaginationProps | undefined =
    paginationProp ||
    (directTotal !== undefined || directPage !== undefined
      ? {
          page: directPage,
          pageCount: directPageCount,
          total: directTotal,
          pageSize: directPageSize,
          onPage: directOnPage,
          onPageChange: directOnPageChange,
        }
      : undefined);

  // Determine current page from props or URL
  const urlPageParam = searchParams?.get('page');
  const urlPage = urlPageParam ? parseInt(urlPageParam, 10) : undefined;
  const currentPage = Math.max(1, pagination?.page ?? (urlPage && !isNaN(urlPage) ? urlPage : 1));

  const total = pagination?.total;
  const pageSize = pagination?.pageSize || 10;
  const pageCount =
    pagination?.pageCount ?? (total !== undefined ? Math.max(1, Math.ceil(total / pageSize)) : 1);

  const handlePageChange = (newPage: number) => {
    const clampedPage = Math.max(1, Math.min(newPage, pageCount));
    if (pagination?.onPageChange) {
      pagination.onPageChange(clampedPage);
    }
    if (pagination?.onPage) {
      pagination.onPage(clampedPage);
    }
    if (directOnPageChange) {
      directOnPageChange(clampedPage);
    }
    if (directOnPage) {
      directOnPage(clampedPage);
    }

    if (pagination?.syncUrl !== false && router && typeof window !== 'undefined') {
      const params = new URLSearchParams(searchParams?.toString() || '');
      params.set('page', String(clampedPage));
      router.push(`${pathname}?${params.toString()}`);
    }
  };

  // Rule: Reset to page 1 when filters change
  const prevFilterKey = useRef<any>(filterKey);
  useEffect(() => {
    if (
      filterKey !== undefined &&
      prevFilterKey.current !== undefined &&
      prevFilterKey.current !== filterKey
    ) {
      if (currentPage !== 1) {
        handlePageChange(1);
      }
    }
    prevFilterKey.current = filterKey;
  }, [filterKey, currentPage]);

  // Rule: Step back one page if deleting empties the current page
  useEffect(() => {
    if (rows.length === 0 && currentPage > 1) {
      handlePageChange(currentPage - 1);
    }
  }, [rows.length, currentPage]);

  return (
    <div className={styles.container}>
      {total !== undefined ? (
        <div className={styles.headerSummary}>
          <span>
            {totalLabel || 'Total records'}:{' '}
            <strong className={styles.totalBadge}>{total.toLocaleString('en-US')}</strong>
          </span>
          {pageCount > 1 ? (
            <span>
              Page {currentPage.toLocaleString('en-US')} of {pageCount.toLocaleString('en-US')}
            </span>
          ) : null}
        </div>
      ) : null}

      <div className={styles.scroll}>
        <table className={styles.table}>
          <caption className="sr-only">{caption}</caption>
          <thead>
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  scope="col"
                  className={`${styles.th} ${column.align === 'end' ? styles.end : ''}`}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={rowKey(row)} className={styles.row}>
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={`${styles.td} ${column.align === 'end' ? styles.end : ''}`}
                  >
                    {column.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && empty ? <p className={styles.empty}>{empty}</p> : null}
      </div>

      {pagination && (total === undefined || total > 0) && (
        <Pagination
          page={currentPage}
          pageCount={pageCount}
          shown={rows.length}
          total={total ?? rows.length}
          onPage={handlePageChange}
        />
      )}
    </div>
  );
}
