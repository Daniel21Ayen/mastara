// apps/mobile/src/modules/profile/components/AcademicFields.tsx
import { STUDENT_STREAMS } from '@mastara/domain';
import type { StudentStream } from '@mastara/domain';
import { View } from 'react-native';

import { useI18n } from '@/core/i18n';
import { createStyles, useTheme } from '@/core/theme';
import type { FormApi } from '@/shared/hooks';
import { AppButton, AppText, SegmentedControl, SelectField } from '@/shared/ui';
import type { SegmentOption } from '@/shared/ui';

import { useAcademicOptions } from '../hooks/useAcademicOptions';

export type AcademicValues = {
  universityId: string;
  programId: string;
  semesterId: string;
  stream: StudentStream;
};

interface AcademicFieldsProps {
  form: FormApi<AcademicValues, unknown>;
  /** Called after any change. Profile Setup uses it to clear the chosen courses. */
  onChange?: () => void;
}

/** University, program, semester and stream pickers. Shared by Profile Setup and Edit academic details. */
export function AcademicFields({ form, onChange }: AcademicFieldsProps) {
  const theme = useTheme();
  const styles = useStyles();
  const { t, te } = useI18n();
  const { values, errors } = form;
  const options = useAcademicOptions(values.universityId, values.programId);

  const streams: SegmentOption<StudentStream>[] = STUDENT_STREAMS.map((stream) => ({
    value: stream,
    label: t(stream === 'NATURAL' ? 'profile.stream.natural' : 'profile.stream.social'),
  }));

  function change(patch: Partial<AcademicValues>) {
    form.setValues(patch);
    onChange?.();
  }

  return (
    <>
      <SelectField
        label={t('profile.university')}
        placeholder={t('profile.select.university')}
        options={options.universities}
        value={values.universityId}
        onChange={(id) => change({ universityId: id, programId: '', semesterId: '' })}
        error={te(errors.universityId)}
      />
      <SelectField
        label={t('profile.program')}
        placeholder={t('profile.select.program')}
        options={options.programs}
        value={values.programId}
        disabled={!values.universityId}
        onChange={(id) => change({ programId: id, semesterId: '' })}
        error={te(errors.programId)}
      />
      <SelectField
        label={t('profile.semester')}
        placeholder={t('profile.select.semester')}
        options={options.semesters}
        value={values.semesterId}
        disabled={!values.programId}
        onChange={(id) => change({ semesterId: id })}
        error={te(errors.semesterId)}
      />
      <View style={styles.group}>
        <AppText bold>{t('profile.stream')}</AppText>
        <SegmentedControl options={streams} value={values.stream} onChange={(stream) => change({ stream })} />
      </View>
      {options.failed ? (
        <View style={styles.group}>
          <AppText color={theme.colors.danger}>{t('error.generic')}</AppText>
          <AppButton label={t('common.retry')} variant="outline" onPress={options.reload} />
        </View>
      ) : null}
    </>
  );
}

const useStyles = createStyles((theme) => ({
  group: { gap: theme.spacing.xs },
}));
