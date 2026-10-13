// apps/mobile/src/modules/exams/lib/examDownload.ts
import type { DownloadUnit } from '@/core/downloads';

import { examKey, examRemote } from '../api/exam.api';
import type { ExamListing } from '../api/exam.api';

/** Download recipe for one past exam: its details, university and all questions. */
export function examDownload(listing: ExamListing): DownloadUnit {
  const { exam, university } = listing;
  return {
    unitId: `EXAM:${exam.id}`,
    kind: 'EXAM',
    courseId: exam.courseId,
    title: `${university.shortName} ${exam.kind}`,
    meta: listing,
    fetch: async () => {
      const session = await examRemote.getSession(exam.id);
      if (!session) throw new Error('Exam not found');
      return [{ key: examKey(exam.id), value: session }];
    },
  };
}
