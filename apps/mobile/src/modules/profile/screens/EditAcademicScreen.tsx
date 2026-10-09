// apps/mobile/src/modules/profile/screens/EditAcademicScreen.tsx
import { academicScopeSchema } from '@mastara/contracts';
import { useRouter } from 'expo-router';
import { useState } from 'react';

import { useI18n } from '@/core/i18n';
import { useSession } from '@/core/session';
import { theme } from '@/core/theme';
import { useForm } from '@/shared/hooks';
import { AppButton, AppText, BottomSheet, Screen, TopBar } from '@/shared/ui';

import { AcademicFields } from '../components/AcademicFields';
import { useSaveProfile } from '../hooks/useSaveProfile';

/** Change university, program, semester or stream. Because courses depend on them, the course list is cleared after a confirmation. */
export function EditAcademicScreen() {
  const { t } = useI18n();
  const router = useRouter();
  const { user, profile } = useSession();
  const saveProfile = useSaveProfile();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);

  const form = useForm(academicScopeSchema, {
    universityId: profile?.universityId ?? '',
    programId: profile?.programId ?? '',
    semesterId: profile?.semesterId ?? '',
    stream: profile?.stream ?? 'NATURAL',
  });

  const changed =
    !!profile &&
    (form.values.universityId !== profile.universityId ||
      form.values.programId !== profile.programId ||
      form.values.semesterId !== profile.semesterId ||
      form.values.stream !== profile.stream);

  function save() {
    if (!form.validate()) return;
    if (changed) setConfirmOpen(true);
    else router.back();
  }

  async function confirm() {
    if (!user) return;
    setSaving(true);
    setFailed(false);
    try {
      const next = { ...form.values, courseIds: [] };
      await saveProfile(next);
      setConfirmOpen(false);
      router.back();
    } catch {
      setFailed(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen scroll>
      <TopBar title={t('academic.title')} onBack={() => router.back()} />
      <AcademicFields form={form} />
      <AppButton label={t('account.save')} onPress={save} />

      <BottomSheet visible={confirmOpen} title={t('academic.confirm.title')} onClose={() => setConfirmOpen(false)}>
        <AppText muted>{t('academic.confirm.body')}</AppText>
        {failed ? <AppText color={theme.colors.danger}>{t('error.generic')}</AppText> : null}
        <AppButton label={t('academic.confirm.ok')} onPress={() => void confirm()} loading={saving} />
        <AppButton label={t('profile.cancel')} variant="outline" onPress={() => setConfirmOpen(false)} />
      </BottomSheet>
    </Screen>
  );
}
