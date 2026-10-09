// apps/mobile/src/modules/auth/components/RegisterForm.tsx
import { registerSchema } from '@mastara/contracts';

import { useI18n } from '@/core/i18n';
import { theme } from '@/core/theme';
import { FormTextField } from '@/shared/forms';
import { useForm } from '@/shared/hooks';
import { AppButton, AppText } from '@/shared/ui';

import { useAuth } from '../hooks/useAuth';

export function RegisterForm() {
  const { t } = useI18n();
  const { register, loading, error } = useAuth();
  const form = useForm(registerSchema, { name: '', identifier: '', password: '' });

  function submit() {
    const data = form.validate();
    if (data) void register(data);
  }

  return (
    <>
      <FormTextField form={form} name="name" label={t('auth.field.name')} autoCapitalize="words" />
      <FormTextField form={form} name="identifier" label={t('auth.field.identifier')} keyboardType="email-address" />
      <FormTextField form={form} name="password" label={t('auth.field.password')} secureTextEntry />
      {error ? <AppText color={theme.colors.danger}>{t(error)}</AppText> : null}
      <AppButton label={t('auth.action.register')} onPress={submit} loading={loading} />
    </>
  );
}
