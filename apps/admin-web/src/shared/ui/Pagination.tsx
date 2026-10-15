// apps/admin-web/src/shared/ui/Pagination.tsx
import { adminText } from '@/core/i18n';

import { Button } from './Button';
import styles from './Pagination.module.css';

interface PaginationProps {
  page: number;
  pageCount: number;
  /** Rows on this page and in all pages. */
  shown: number;
  total: number;
  onPage: (page: number) => void;
}

export function Pagination({ page, pageCount, shown, total, onPage }: PaginationProps) {
  return (
    <nav className={styles.bar} aria-label={adminText('admin.pagination.label')}>
      <span className={styles.text}>
        {adminText('admin.pagination.showing', {
          shown: shown.toLocaleString('en-US'),
          total: total.toLocaleString('en-US'),
        })}
      </span>
      <span className={styles.controls}>
        <Button variant="outline" disabled={page <= 1} onClick={() => onPage(page - 1)}>
          {adminText('admin.pagination.previous')}
        </Button>
        <span className={styles.text} aria-current="page">
          {adminText('admin.pagination.page', {
            page: page.toLocaleString('en-US'),
            pages: pageCount.toLocaleString('en-US'),
          })}
        </span>
        <Button variant="outline" disabled={page >= pageCount} onClick={() => onPage(page + 1)}>
          {adminText('admin.pagination.next')}
        </Button>
      </span>
    </nav>
  );
}
