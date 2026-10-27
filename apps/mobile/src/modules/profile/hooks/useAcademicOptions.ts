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
  const { t, language } = useI18n();

  const universities = useAsync(() => academicApi.getUniversities());
  const programs = useAsync(universityId ? () => academicApi.getPrograms(universityId) : null, [universityId]);
  const semesters = useAsync(programId ? () => academicApi.getSemesters(programId) : null, [programId]);

  const reload = () => {
    universities.reload();
    if (universityId) programs.reload();
    if (programId) semesters.reload();
  };

  const resolveText = (val: unknown): string => {
    if (!val) return '';
    if (typeof val === 'string') return val;
    if (typeof val === 'object') {
      const loc = val as { en?: string; am?: string };
      return (language === 'am' ? loc.am || loc.en : loc.en || loc.am) || '';
    }
    return String(val);
  };

  return {
    universities: (universities.data ?? []).map((item) => {
      const name = language === 'am' && item.nameAm ? item.nameAm : resolveText(item.name);
      const shortName = resolveText(item.shortName);
      return {
        value: item.id,
        label: shortName && shortName !== name ? `${shortName} · ${name}` : name,
      };
    }),
    programs: (programs.data ?? []).map((item) => ({
      value: item.id,
      label: language === 'am' && item.nameAm ? item.nameAm : resolveText(item.name),
    })),
    semesters: (semesters.data ?? []).map((item) => ({
      value: item.id,
      label: t(item.number === 1 ? 'profile.semester.1' : 'profile.semester.2'),
    })),
    loading: universities.loading || programs.loading || semesters.loading,
    failed: Boolean(universities.error || programs.error || semesters.error),
    reload,
  };
}
