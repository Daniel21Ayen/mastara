// apps/mobile/src/modules/auth/screens/EditAccountScreen.tsx
import { editAccountSchema } from '@mastara/contracts';
import { useRouter } from 'expo-router';
import { useState } from 'react';

import { useI18n } from '@/core/i18n';
import { useSession } from '@/core/session';
import { useTheme } from '@/core/theme';
import { FormTextField } from '@/shared/forms';
import { useForm } from '@/shared/hooks';
import { AppButton, AppText, Screen, TopBar } from '@/shared/ui';

import { authApi } from '../api/auth.api';

/** Change the name and the phone or email. */
export function EditAccountScreen() {
  const theme = useTheme();
  const { t } = useI18n();
  const router = useRouter();
  const { user, updateUser } = useSession();
  const form = useForm(editAccountSchema, { name: user?.name ?? '', identifier: user?.identifier ?? '' });
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);

  async function save() {
    const data = form.validate();
    if (!data || !user) return;
    setSaving(true);
    setFailed(false);
    try {
      updateUser(await authApi.updateAccount(user, data));
      router.back();
    } catch {
      setFailed(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen scroll>
      <TopBar title={t('account.title')} onBack={() => router.back()} />
      <FormTextField form={form} name="name" label={t('auth.field.name')} autoCapitalize="words" />
      <FormTextField form={form} name="identifier" label={t('auth.field.identifier')} keyboardType="email-address" />
      {failed ? <AppText color={theme.colors.danger}>{t('error.generic')}</AppText> : null}
      <AppButton label={t('account.save')} onPress={() => void save()} loading={saving} />
    </Screen>
  );
}
