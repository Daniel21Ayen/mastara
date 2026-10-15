// apps/admin-web/src/modules/scans/components/PagesPicker.tsx
'use client';

import { fileSizeText, SCAN_FILE_TYPES, SCAN_PAGES_MAX } from '@mastara/domain';
import { useRef } from 'react';

import { adminText } from '@/core/i18n';
import { Button, Icon } from '@/shared/ui';

import { toItem } from '../lib/scanForm';
import type { PageItem } from '../lib/scanForm';

import styles from './Scans.module.css';

interface PagesPickerProps {
  pages: readonly PageItem[];
  /** Already translated message shown under the list. */
  error?: string;
  onChange: (pages: PageItem[]) => void;
  /** Called with the names of files that were not added, and why. */
  onRejected: (problems: string[]) => void;
}

/** The scanned pages, in the order they become one PDF. Images and PDFs can be added; pages can move or go. */
export function PagesPicker({ pages, error, onChange, onRejected }: PagesPickerProps) {
  const input = useRef<HTMLInputElement>(null);

  function add(files: FileList | null) {
    if (!files) return;
    const added: PageItem[] = [];
    const rejected: string[] = [];
    for (const file of Array.from(files)) {
      const result = toItem(file);
      if ('item' in result) {
        if (pages.length + added.length >= SCAN_PAGES_MAX) {
          rejected.push(adminText('admin.scans.pages.tooMany', { max: SCAN_PAGES_MAX }));
          break;
        }
        added.push(result.item);
      } else {
        rejected.push(
          adminText(
            result.problem === 'type' ? 'admin.scans.file.badType' : 'admin.scans.file.tooBig',
            {
              name: result.name,
            },
          ),
        );
      }
    }
    onRejected(rejected);
    if (added.length > 0) onChange([...pages, ...added]);
    if (input.current) input.current.value = '';
  }

  const move = (index: number, by: -1 | 1) => {
    const next = [...pages];
    const [item] = next.splice(index, 1);
    if (item) next.splice(index + by, 0, item);
    onChange(next);
  };

  return (
    <div className={styles.pages}>
      <input
        ref={input}
        type="file"
        multiple
        hidden
        accept={SCAN_FILE_TYPES.join(',')}
        aria-label={adminText('admin.scans.pages.input')}
        onChange={(event) => add(event.target.files)}
      />
      <div>
        <Button variant="outline" onClick={() => input.current?.click()}>
          <Icon name="plus" size={18} />
          {adminText('admin.scans.pages.add')}
        </Button>
      </div>
      <p className={styles.hint}>{adminText('admin.scans.pages.hint')}</p>
      {pages.length > 0 ? (
        <ol className={styles.pageList}>
          {pages.map((page, index) => (
            <li key={page.key} className={styles.page}>
              <span className={styles.thumb}>
                {page.url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={page.url} alt="" className={styles.thumbImage} />
                ) : (
                  <Icon name="note" size={22} />
                )}
              </span>
              <span className={styles.pageText}>
                <span className={styles.pageName}>
                  {adminText('admin.scans.pages.number', { n: index + 1 })} · {page.file.name}
                </span>
                <span className={styles.hint}>{fileSizeText(page.file.sizeBytes)}</span>
              </span>
              <Button
                variant="outline"
                disabled={index === 0}
                aria-label={adminText('admin.scans.pages.up', { n: index + 1 })}
                onClick={() => move(index, -1)}
              >
                <Icon name="chevronUp" size={18} />
              </Button>
              <Button
                variant="outline"
                disabled={index === pages.length - 1}
                aria-label={adminText('admin.scans.pages.down', { n: index + 1 })}
                onClick={() => move(index, 1)}
              >
                <Icon name="chevronDown" size={18} />
              </Button>
              <button
                type="button"
                className={styles.remove}
                aria-label={adminText('admin.scans.pages.remove', { n: index + 1 })}
                onClick={() => onChange(pages.filter((item) => item.key !== page.key))}
              >
                <Icon name="trash" size={18} />
              </button>
            </li>
          ))}
        </ol>
      ) : null}
      {error ? <p className={styles.error}>{error}</p> : null}
    </div>
  );
}
