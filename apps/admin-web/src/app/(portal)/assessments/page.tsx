// apps/admin-web/src/app/(portal)/assessments/page.tsx
import type { Metadata } from 'next';
import { UnifiedAssessmentsHubScreen } from '@/modules/tests';

export const metadata: Metadata = {
  title: 'Unified Assessments Management | Mastara Admin',
  description: 'Consolidated test management, quizzes, section checks, and exams',
};

export default function Page() {
  return <UnifiedAssessmentsHubScreen />;
}
