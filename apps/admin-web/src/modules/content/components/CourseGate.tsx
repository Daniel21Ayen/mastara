// apps/admin-web/src/modules/content/components/CourseGate.tsx
'use client';

import type { ContentCourse } from '@mastara/contracts';
import type { ReactNode } from 'react';

import { adminText } from '@/core/i18n';
import { Button, StateMessage } from '@/shared/ui';

import { useContentCourse } from '../state/ContentCourseContext';

/** Shows loading, error or empty text until a course is chosen, then renders the page for it. */
export function CourseGate({ children }: { children: (course: ContentCourse) => ReactNode }) {
  const { course, loading, failed, reload } = useContentCourse();

  if (failed) {
    return (
      <StateMessage tone="alert">
        <span>{adminText('admin.content.error')}</span>
        <Button variant="outline" onClick={reload}>
          {adminText('admin.common.retry')}
        </Button>
      </StateMessage>
    );
  }
  if (!course) {
    return (
      <StateMessage>
        {loading ? adminText('admin.common.loading') : adminText('admin.content.noCourses')}
      </StateMessage>
    );
  }
  // Remounts the page when the course changes, so lists and dialogs never show the old course.
  return <div key={course.id}>{children(course)}</div>;
}
