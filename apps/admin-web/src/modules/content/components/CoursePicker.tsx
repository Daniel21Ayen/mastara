// apps/admin-web/src/modules/content/components/CoursePicker.tsx
'use client';

import { adminText } from '@/core/i18n';
import { SelectField } from '@/shared/ui';

import { useContentCourse } from '../state/ContentCourseContext';

import styles from './CoursePicker.module.css';

/** The course every Content page works on. */
export function CoursePicker() {
  const { courses, course, setCourseId } = useContentCourse();
  return (
    <SelectField
      className={styles.picker}
      hideLabel
      label={adminText('admin.content.course')}
      options={courses.map((item) => ({
        value: item.id,
        label: `${item.title} (${item.code}) · ${item.programName} · ${item.universityShortName}`,
      }))}
      value={course?.id ?? ''}
      disabled={courses.length === 0}
      onChange={(event) => setCourseId(event.target.value)}
    />
  );
}
