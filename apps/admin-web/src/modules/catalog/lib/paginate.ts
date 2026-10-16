// apps/admin-web/src/modules/catalog/lib/paginate.ts
import { CATALOG_PAGE_SIZE } from '@mastara/domain';

export interface Paged<T> {
  items: T[];
  page: number;
  pageCount: number;
  total: number;
}

/** One page of a list held in memory. A page past the end falls back to the last page (after a delete). */
export function paginate<T>(rows: readonly T[], page: number, size = CATALOG_PAGE_SIZE): Paged<T> {
  const pageCount = Math.max(1, Math.ceil(rows.length / size));
  const current = Math.min(Math.max(1, page), pageCount);
  const start = (current - 1) * size;
  return { items: rows.slice(start, start + size), page: current, pageCount, total: rows.length };
}
