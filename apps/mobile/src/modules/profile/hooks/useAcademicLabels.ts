// apps/mobile/src/modules/profile/hooks/useAcademicLabels.ts
import type { StudentProfile } from '@mastara/contracts';

import { useAsync } from '@/shared/hooks';

import { academicApi } from '../api/academic.api';

/** Readable names for the saved university, program and semester number. */
export function useAcademicLabels(profile: StudentProfile | null) {
  const state = useAsync(
    profile
      ? async () => {
          const [universities, programs, semesters] = await Promise.all([
            academicApi.getUniversities(),
            academicApi.getPrograms(profile.universityId),
            academicApi.getSemesters(profile.programId),
          ]);
          return {
            university: universities.find((item) => item.id === profile.universityId)?.shortName ?? '',
            program: programs.find((item) => item.id === profile.programId)?.name ?? '',
            semester: semesters.find((item) => item.id === profile.semesterId)?.number,
          };
        }
      : null,
    [profile?.universityId, profile?.programId, profile?.semesterId],
  );

  return state.data;
}
