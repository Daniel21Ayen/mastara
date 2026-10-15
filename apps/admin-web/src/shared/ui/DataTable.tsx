// apps/admin-web/src/shared/ui/DataTable.tsx
import type { ReactNode } from 'react';

import styles from './DataTable.module.css';

export interface Column<Row> {
  key: string;
  header: string;
  render: (row: Row) => ReactNode;
  /** Right-align numbers. */
  align?: 'start' | 'end';
}

interface DataTableProps<Row> {
  /** Names the table for screen readers; not shown. */
  caption: string;
  columns: readonly Column<Row>[];
  rows: readonly Row[];
  rowKey: (row: Row) => string;
  /** Shown instead of the body when there are no rows. */
  empty?: string;
}

/** A plain, accessible table. It scrolls sideways on narrow screens instead of squeezing columns. */
export function DataTable<Row>({ caption, columns, rows, rowKey, empty }: DataTableProps<Row>) {
  return (
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
  );
}
