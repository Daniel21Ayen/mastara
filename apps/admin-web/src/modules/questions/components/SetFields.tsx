// apps/admin-web/src/modules/questions/components/SetFields.tsx
import { needsCourse, SET_YEARS, STREAMS } from '@mastara/domain';
import type { ExamSetKind, Stream } from '@mastara/domain';

import { adminText } from '@/core/i18n';
import { programsOf, useScanCourses, useUniversities, usePrograms } from '@/modules/scans';
import { SelectField } from '@/shared/ui';

import type { SetDetailsState } from '../lib/examSetForm';

import styles from './Questions.module.css';

export type SetErrors = Record<string, string | undefined>;

interface FieldsProps {
  kind: ExamSetKind;
  details: SetDetailsState;
  errors: SetErrors;
  /** Changes some details and clears the errors of the named fields. */
  onChange: (change: Partial<SetDetailsState>, ...clear: string[]) => void;
}

/** "2023 / 2024" for the academic year that starts in 2023. */
export const yearText = (year: number): string => `${year} / ${year + 1}`;

interface IdFieldProps extends FieldsProps {
  /** An existing set keeps its ID. */
  locked?: boolean;
  onIdBlur?: () => void;
}

/** University, Program / Department, Semester, Stream and (not for COC) Course. */
export function SetScopeFields({ kind, details, errors, onChange, locked: _locked, onIdBlur: _onIdBlur }: IdFieldProps) {
  const universities = useUniversities();
  const programs = usePrograms();
  const courses = useScanCourses(details.programId, details.semester, details.stream);

  return (
    <div className={styles.grid}>
      <SelectField
        label={adminText('admin.questions.field.university')}
        placeholder={adminText('admin.scans.field.selectUniversity')}
        options={(universities.data ?? []).map((item) => ({
          value: item.id,
          label: item.shortName,
        }))}
        value={details.universityId}
        onChange={(event) =>
          onChange(
            { universityId: event.target.value, programId: '', courseId: '' },
            'universityId',
            'programId',
          )
        }
        error={errors.universityId}
      />
      <SelectField
        label={adminText('admin.questions.field.program')}
        placeholder={adminText('admin.scans.field.selectProgram')}
        options={programsOf(programs.data ?? [], details.universityId).map((program) => ({
          value: program.id,
          label: program.name,
        }))}
        value={details.programId}
        disabled={details.universityId === ''}
        onChange={(event) => onChange({ programId: event.target.value, courseId: '' }, 'programId')}
        error={errors.programId}
      />
      <SelectField
        label={adminText('admin.questions.field.semester')}
        placeholder={adminText('admin.scans.field.selectSemester')}
        options={(['1', '2'] as const).map((value) => ({
          value,
          label: adminText(`admin.questions.semester.${value}`),
        }))}
        value={details.semester}
        onChange={(event) =>
          onChange(
            { semester: event.target.value as SetDetailsState['semester'], courseId: '' },
            'semesterNumber',
          )
        }
        error={errors.semesterNumber}
      />
      <SelectField
        label={adminText('admin.questions.field.stream')}
        placeholder={adminText('admin.scans.field.selectStream')}
        options={STREAMS.map((value) => ({
          value,
          label: adminText(`admin.stream.${value}`),
        }))}
        value={details.stream}
        onChange={(event) =>
          onChange({ stream: event.target.value as Stream | '', courseId: '' }, 'stream')
        }
        error={errors.stream}
      />
      {needsCourse(kind) ? (
        <SelectField
          label={adminText('admin.questions.field.course')}
          placeholder={adminText('admin.scans.field.selectCourse')}
          options={(courses.data ?? []).map((item) => ({
            value: item.id,
            label: `${item.code} · ${item.title}`,
          }))}
          value={details.courseId}
          disabled={(courses.data ?? []).length === 0}
          onChange={(event) => onChange({ courseId: event.target.value }, 'courseId')}
          error={errors.courseId}
        />
      ) : null}
    </div>
  );
}

/** Year (the academic year for the set). */
export function SetTermsFields({
  details,
  errors,
  onChange,
}: Pick<FieldsProps, 'details' | 'errors' | 'onChange'>) {
  return (
    <div className={styles.grid}>
      <SelectField
        label={adminText('admin.questions.field.year')}
        options={SET_YEARS.map((year) => ({ value: String(year), label: yearText(year) }))}
        value={details.year}
        onChange={(event) => onChange({ year: event.target.value }, 'year')}
        error={errors.year}
      />
    </div>
  );
}
