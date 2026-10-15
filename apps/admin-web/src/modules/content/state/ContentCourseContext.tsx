// apps/admin-web/src/modules/content/state/ContentCourseContext.tsx
'use client';

import type { ContentCourse } from '@mastara/contracts';
import { createContext, useContext, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

import { useAsync } from '@/shared/hooks';

import { contentApi } from '../api/content.api';

interface ContentCourseValue {
  courses: readonly ContentCourse[];
  loading: boolean;
  failed: boolean;
  reload: () => void;
  /** The course every Content page works on; the first course until the admin picks another. */
  course: ContentCourse | null;
  setCourseId: (id: string) => void;
}

const Context = createContext<ContentCourseValue | null>(null);

/**
 * Keeps the chosen course while the admin moves between Content pages (the layout stays mounted),
 * so Modules, Notes and Tests all show the same course.
 */
export function ContentCourseProvider({ children }: { children: ReactNode }) {
  const { data, error, loading, reload } = useAsync(() => contentApi.listCourses());
  const [picked, setPicked] = useState<string | null>(null);

  const value = useMemo<ContentCourseValue>(() => {
    const courses = data ?? [];
    const course = courses.find((item) => item.id === picked) ?? courses[0] ?? null;
    return { courses, loading, failed: error !== null, reload, course, setCourseId: setPicked };
  }, [data, error, loading, reload, picked]);

  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useContentCourse(): ContentCourseValue {
  const value = useContext(Context);
  if (!value) throw new Error('useContentCourse needs a ContentCourseProvider above it.');
  return value;
}
