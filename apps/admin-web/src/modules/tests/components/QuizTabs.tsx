// apps/admin-web/src/modules/tests/components/QuizTabs.tsx
import { QUIZ_NUMBERS, quizSlug } from '@mastara/domain';
import type { QuizNumber } from '@mastara/domain';

import { adminText } from '@/core/i18n';
import { TabLinks } from '@/shared/ui';

/** Quiz 1 | Quiz 2 | Quiz 3 as links, each its own page. */
export function QuizTabs({ current }: { current: QuizNumber }) {
  return (
    <TabLinks
      label={adminText('admin.tests.quizzes')}
      current={quizSlug(current)}
      items={QUIZ_NUMBERS.map((quizNo) => ({
        id: quizSlug(quizNo),
        href: `/content/tests/${quizSlug(quizNo)}`,
        label: adminText(`admin.nav.quiz${quizNo}`),
        icon: 'quiz' as const,
      }))}
    />
  );
}
