// apps/mobile/src/modules/auth/components/LoginForm.tsx
import { loginSchema } from '@mastara/contracts';

import { useI18n } from '@/core/i18n';
import { theme } from '@/core/theme';
import { FormTextField } from '@/shared/forms';
import { useForm } from '@/shared/hooks';
import { AppButton, AppText } from '@/shared/ui';

import { useAuth } from '../hooks/useAuth';

export function LoginForm() {
  const { t } = useI18n();
  const { login, loading, error } = useAuth();
  const form = useForm(loginSchema, { identifier: '', password: '' });

  function submit() {
    const data = form.validate();
    if (data) void login(data);
  }

  return (
    <>
      <FormTextField form={form} name="identifier" label={t('auth.field.identifier')} keyboardType="email-address" />
      <FormTextField form={form} name="password" label={t('auth.field.password')} secureTextEntry />
      {error ? <AppText color={theme.colors.danger}>{t(error)}</AppText> : null}
      <AppButton label={t('auth.action.login')} onPress={submit} loading={loading} />
      <AppText bold color={theme.colors.primary} style={{ textAlign: 'center' }}>
        {t('auth.forgot')}
      </AppText>
    </>
  );
}
