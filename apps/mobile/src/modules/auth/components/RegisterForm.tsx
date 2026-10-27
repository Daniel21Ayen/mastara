// apps/mobile/src/modules/auth/components/RegisterForm.tsx
import { registerSchema } from '@mastara/contracts';

import { View } from 'react-native';

import { useI18n } from '@/core/i18n';
import { useTheme } from '@/core/theme';
import { FormTextField } from '@/shared/forms';
import { useForm } from '@/shared/hooks';
import { AppButton, AppText } from '@/shared/ui';

import { useAuth } from '../hooks/useAuth';

export function RegisterForm() {
  const theme = useTheme();
  const { t } = useI18n();
  const { register, loading, error } = useAuth();
  const form = useForm(registerSchema, { name: '', identifier: '', password: '' });

  function submit() {
    const data = form.validate();
    if (data) void register(data);
  }

  return (
    <>
      <View
        style={{
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.primary,
          borderWidth: 1,
          borderRadius: theme.radius.md,
          padding: theme.spacing.md,
          marginVertical: theme.spacing.xs,
        }}
      >
        <AppText variant="caption" color={theme.colors.text}>
          {t('auth.localNotice')}
        </AppText>
      </View>
      <FormTextField form={form} name="name" label={t('auth.field.name')} autoCapitalize="words" />
      <FormTextField form={form} name="identifier" label={t('auth.field.identifier')} keyboardType="email-address" />
      <FormTextField form={form} name="password" label={t('auth.field.password')} secureTextEntry />
      {error ? <AppText color={theme.colors.danger}>{t(error)}</AppText> : null}
      <AppButton label={t('auth.action.register')} onPress={submit} loading={loading} />
    </>
  );
}
