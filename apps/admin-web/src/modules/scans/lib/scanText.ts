// apps/admin-web/src/modules/scans/lib/scanText.ts
import type { AdminScan } from '@mastara/contracts';

import { adminText } from '@/core/i18n';

/** "COC", "Mid exam", "Note", "Quiz 2": what the scan is for, in words. */
export function scanTypeText(scan: Pick<AdminScan, 'kind' | 'subKind'>): string {
  switch (scan.kind) {
    case 'EXAM':
      return adminText(`admin.scans.examKind.${scan.subKind as 'MID' | 'FINAL' | 'MOCK'}`);
    case 'MATERIAL':
      return adminText(
        `admin.scans.material.${scan.subKind as 'MODULE' | 'NOTE' | 'AMHARIC_NOTE'}`,
      );
    case 'QUIZ':
      return adminText(`admin.nav.quiz${scan.subKind as '1' | '2' | '3'}`);
    default:
      return adminText('admin.scans.kind.COC');
  }
}

/** One line saying where the scan belongs. */
export function scanWhere(scan: AdminScan): string {
  if (scan.kind === 'COC') {
    return `${scan.universityShortName} · ${scan.programName} · ${scan.year ?? ''}`;
  }
  return `${scan.courseCode ?? ''} · ${scan.universityShortName} · ${scan.programName}`;
}
