// apps/mobile/src/modules/profile/screens/ProfileSetupScreen.tsx
import { academicScopeSchema } from '@mastara/contracts';
import type { StudentProfile } from '@mastara/contracts';
import { useState } from 'react';
import { View } from 'react-native';

import { useI18n } from '@/core/i18n';
import { useSession } from '@/core/session';
import { createStyles, useTheme } from '@/core/theme';
import { CoursePicker } from '@/modules/course-list';
import { useForm } from '@/shared/hooks';
import { AppButton, AppText, Screen, ScreenHeader } from '@/shared/ui';

import { AcademicFields } from '../components/AcademicFields';
import type { AcademicValues } from '../components/AcademicFields';
import { useSaveProfile } from '../hooks/useSaveProfile';

type Step = 'academic' | 'courses';

const INITIAL: AcademicValues = { universityId: '', programId: '', semesterId: '', stream: 'NATURAL' };

/** First-run setup: academic details, then choose courses, then Home. */
export function ProfileSetupScreen() {
  const theme = useTheme();
  const styles = useStyles();
  const { t } = useI18n();
  const { user } = useSession();
  const saveProfile = useSaveProfile();

  const [step, setStep] = useState<Step>('academic');
  const [courseIds, setCourseIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);

  const form = useForm(academicScopeSchema, INITIAL);
  const { values } = form;

  async function save() {
    if (!user) return;
    setSaving(true);
    setSaveFailed(false);
    try {
      const profile: StudentProfile = { ...values, courseIds };
      await saveProfile(profile); // works offline; the route guard now moves the student to Home
    } catch {
      setSaveFailed(true);
    } finally {
      setSaving(false);
    }
  }

  if (step === 'courses') {
    return (
      <Screen scroll>
        <ScreenHeader title={t('courses.title')} subtitle={t('courses.subtitle')} />
        <CoursePicker semesterId={values.semesterId} stream={values.stream} selectedIds={courseIds} onChange={setCourseIds} />
        {saveFailed ? <AppText color={theme.colors.danger}>{t('error.generic')}</AppText> : null}
        <View style={styles.actions}>
          <AppButton label={t('common.back')} variant="outline" onPress={() => setStep('academic')} />
          <AppButton label={t('courses.save')} onPress={() => void save()} loading={saving} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen scroll>
      <ScreenHeader title={t('profile.title')} subtitle={t('profile.subtitle')} />
      {/* Courses depend on the scope, so any change starts the course list again. */}
      <AcademicFields form={form} onChange={() => setCourseIds([])} />
      <AppButton label={t('common.continue')} onPress={() => form.validate() && setStep('courses')} />
    </Screen>
  );
}

const useStyles = createStyles((theme) => ({
  actions: { gap: theme.spacing.sm },
}));
