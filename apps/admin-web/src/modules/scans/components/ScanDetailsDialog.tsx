// apps/admin-web/src/modules/scans/components/ScanDetailsDialog.tsx
'use client';

import type { AdminScan } from '@mastara/contracts';
import { fileSizeText } from '@mastara/domain';

import { formatDate } from '@/core/format';
import { adminText } from '@/core/i18n';
import { Button, DescriptionList, Modal } from '@/shared/ui';
import type { DescriptionRow } from '@/shared/ui';

import { scanTypeText } from '../lib/scanText';

import styles from './Scans.module.css';

/** Everything saved with a scan: where it belongs, its pages and its answers. */
export function ScanDetailsDialog({ scan, onClose }: { scan: AdminScan; onClose: () => void }) {
  const row = (label: string, value: string | number | null): DescriptionRow[] =>
    value === null || value === '' ? [] : [{ label, value }];

  const rows: DescriptionRow[] = [
    { label: adminText('admin.scans.col.type'), value: scanTypeText(scan) },
    ...row(adminText('admin.scans.field.examSetId'), scan.examSetId),
    { label: adminText('admin.scans.field.university'), value: scan.universityShortName },
    { label: adminText('admin.scans.field.program'), value: scan.programName },
    ...row(adminText('admin.scans.field.year'), scan.year),
    ...row(
      adminText('admin.scans.field.semester'),
      scan.semesterNumber === null
        ? null
        : adminText('admin.catalog.form.semesterOption', { n: scan.semesterNumber }),
    ),
    ...row(
      adminText('admin.scans.field.stream'),
      scan.stream ? adminText(`admin.stream.${scan.stream}`) : null,
    ),
    ...row(
      adminText('admin.scans.field.course'),
      scan.courseCode ? `${scan.courseCode} · ${scan.courseTitle ?? ''}` : null,
    ),
    ...row(adminText('admin.scans.field.topic'), scan.topicLabel),
    ...row(adminText('admin.scans.field.title'), scan.title),
    ...row(adminText('admin.scans.field.description'), scan.description),
    {
      label: adminText('admin.scans.col.pages'),
      value: (
        <>
          {scan.pages.map((page) => (
            <span key={page.name} className={styles.fileLine}>
              {page.name} · {fileSizeText(page.sizeBytes)}
            </span>
          ))}
        </>
      ),
    },
    { label: adminText('admin.scans.col.added'), value: formatDate(scan.createdAt) },
  ];

  return (
    <Modal title={adminText('admin.scans.details.dialog', { id: scan.id })} onClose={onClose} wide>
      <div className={styles.form}>
        <DescriptionList rows={rows} />
        {scan.answers.length > 0 ? (
          <>
            <h3 className={styles.legend}>{adminText('admin.scans.answers.title')}</h3>
            <ul className={styles.pageList}>
              {scan.answers.map((answer) => (
                <li key={answer.questionId} className={styles.page}>
                  <span className={styles.pageText}>
                    <span className={styles.pageName}>
                      {answer.questionId}
                      {answer.questionType
                        ? ` · ${adminText(`admin.tests.type.${answer.questionType}`)}`
                        : ''}
                    </span>
                    {answer.text ? <span className={styles.fileLine}>{answer.text}</span> : null}
                    {answer.file ? (
                      <span className={styles.hint}>
                        {answer.file.name} · {fileSizeText(answer.file.sizeBytes)}
                      </span>
                    ) : null}
                  </span>
                </li>
              ))}
            </ul>
          </>
        ) : null}
        <div className={styles.footer}>
          <Button variant="outline" onClick={onClose}>
            {adminText('admin.common.close')}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
