// apps/mobile/src/modules/auth/screens/AuthScreen.tsx
import { LANGUAGES } from '@mastara/i18n';
import { useState } from 'react';
import { View } from 'react-native';

import { useI18n } from '@/core/i18n';
import { useSession } from '@/core/session';
import { createStyles } from '@/core/theme';
import { AppButton, Screen, ScreenHeader, SegmentedControl, ThemeSwitch } from '@/shared/ui';
import type { SegmentOption } from '@/shared/ui';

import { LoginForm } from '../components/LoginForm';
import { RegisterForm } from '../components/RegisterForm';

type Tab = 'login' | 'register';

export function AuthScreen() {
  const styles = useStyles();
  const { t, language, setLanguage } = useI18n();
  const [tab, setTab] = useState<Tab>('login');

  const tabs: SegmentOption<Tab>[] = [
    { value: 'login', label: t('auth.tab.login') },
    { value: 'register', label: t('auth.tab.register') },
  ];

  return (
    <Screen scroll>
      <ScreenHeader title={t('auth.title')} subtitle={t('auth.subtitle')} />
      <SegmentedControl options={tabs} value={tab} onChange={setTab} />

      {tab === 'login' ? <LoginForm /> : <RegisterForm />}

      <View style={styles.languages}>
        {LANGUAGES.map((code) => (
          <View key={code} style={styles.flex}>
            <AppButton
              label={code === 'en' ? t('common.english') : t('common.amharic')}
              variant={language === code ? 'primary' : 'outline'}
              onPress={() => setLanguage(code)}
            />
          </View>
        ))}
      </View>
      <ThemeSwitch />
    </Screen>
  );
}

const useStyles = createStyles((theme) => ({
  languages: { flexDirection: 'row', gap: theme.spacing.sm, marginTop: theme.spacing.md },
  flex: { flex: 1 },
}));
