// apps/mobile/src/modules/profile/hooks/useAcademicOptions.ts
import { useI18n } from '@/core/i18n';
import { useAsync } from '@/shared/hooks';
import type { SelectOption } from '@/shared/ui';

import { academicApi } from '../api/academic.api';

interface Options {
  universities: SelectOption[];
  programs: SelectOption[];
  semesters: SelectOption[];
  loading: boolean;
  failed: boolean;
  reload: () => void;
}

/** Cascading options: programs depend on the university, semesters on the program. */
export function useAcademicOptions(universityId: string, programId: string): Options {
  const { t } = useI18n();

  const universities = useAsync(() => academicApi.getUniversities());
  const programs = useAsync(universityId ? () => academicApi.getPrograms(universityId) : null, [universityId]);
  const semesters = useAsync(programId ? () => academicApi.getSemesters(programId) : null, [programId]);

  const reload = () => {
    universities.reload();
    if (universityId) programs.reload();
    if (programId) semesters.reload();
  };

  return {
    universities: (universities.data ?? []).map((item) => ({
      value: item.id,
      label: item.shortName && item.shortName !== item.name ? `${item.shortName} · ${item.name}` : item.name,
    })),
    programs: (programs.data ?? []).map((item) => ({ value: item.id, label: item.name })),
    semesters: (semesters.data ?? []).map((item) => ({
      value: item.id,
      label: t(item.number === 1 ? 'profile.semester.1' : 'profile.semester.2'),
    })),
    loading: universities.loading || programs.loading || semesters.loading,
    failed: Boolean(universities.error || programs.error || semesters.error),
    reload,
  };
}
