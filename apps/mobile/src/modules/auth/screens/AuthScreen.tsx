// apps/mobile/src/modules/auth/screens/AuthScreen.tsx
import { LANGUAGES } from '@mastara/i18n';
import { useState } from 'react';
import { View } from 'react-native';

import { useI18n } from '@/core/i18n';
import { useSession } from '@/core/session';
import { createStyles, useTheme } from '@/core/theme';
import { AppButton, AppText, Screen, ScreenHeader, SegmentedControl, ThemeSwitch } from '@/shared/ui';
import type { SegmentOption } from '@/shared/ui';

import { LoginForm } from '../components/LoginForm';
import { RegisterForm } from '../components/RegisterForm';

type Tab = 'login' | 'register';

export function AuthScreen() {
  const styles = useStyles();
  const theme = useTheme();
  const { t, language, setLanguage } = useI18n();
  const { continueAsGuest } = useSession();
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

      {/* Guest browsing: see catalog + free content without registering */}
      <View style={styles.guestSection}>
        <View style={styles.dividerRow}>
          <View style={styles.line} />
          <AppText variant="caption" muted style={styles.orText}>
            {language === 'am' ? 'ወይም' : 'or'}
          </AppText>
          <View style={styles.line} />
        </View>
        <AppButton
          label={language === 'am' ? 'እንደ እንግዳ ቃኚ' : 'Browse as Guest'}
          variant="outline"
          onPress={continueAsGuest}
        />
        <AppText variant="caption" muted style={styles.guestHint}>
          {language === 'am'
            ? 'ነጻ ኮርሶችን ያንብቡ፣ ሁሉንም ካታሎግ ይመልከቱ። ለሁሉም ይዘት ወደ ሙሉ ዝግጅት ይግዙ።'
            : 'Browse the course catalog and read free content. Purchase a bundle to unlock all content.'}
        </AppText>
      </View>

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
  guestSection: { marginTop: theme.spacing.lg, gap: theme.spacing.sm },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  line: { flex: 1, height: 1, backgroundColor: theme.colors.border },
  orText: { marginHorizontal: theme.spacing.xs },
  guestHint: { textAlign: 'center', paddingHorizontal: theme.spacing.md },
}));

