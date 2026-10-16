// apps/admin-web/src/modules/questions/components/SetTabs.tsx
import { EXAM_SET_KINDS, examSetSlug } from '@mastara/domain';
import type { ExamSetKind } from '@mastara/domain';

import { adminText } from '@/core/i18n';
import { TabLinks } from '@/shared/ui';

/** Mid Exams | Final Exams | COC Exam | Mock Exam as links, each its own page. */
export function SetTabs({ current }: { current: ExamSetKind }) {
  return (
    <TabLinks
      label={adminText('admin.questions.tabs')}
      current={examSetSlug(current)}
      items={EXAM_SET_KINDS.map((kind) => ({
        id: examSetSlug(kind),
        href: `/questions/${examSetSlug(kind)}`,
        label: adminText(`admin.questions.kind.${kind}`),
      }))}
    />
  );
}
