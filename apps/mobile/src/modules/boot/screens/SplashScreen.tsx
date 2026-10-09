// apps/mobile/src/modules/boot/screens/SplashScreen.tsx
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { useI18n } from '@/core/i18n';
import { theme } from '@/core/theme';
import { AppText } from '@/shared/ui';

/** Shown while the saved session is restored. The route guard then moves the student on. */
export function SplashScreen() {
  const { t } = useI18n();

  return (
    <View style={styles.root}>
      <View style={styles.logo}>
        <AppText variant="title" color={theme.colors.primary}>
          M
        </AppText>
      </View>
      <AppText variant="title" color={theme.colors.onPrimary}>
        {t('app.name')}
      </AppText>
      <AppText variant="bodyLarge" color={theme.colors.onPrimary}>
        {t('app.tagline')}
      </AppText>
      <ActivityIndicator color={theme.colors.onPrimary} style={styles.spinner} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
  },
  logo: {
    width: 88,
    height: 88,
    borderRadius: theme.radius.xl,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.md,
  },
  spinner: { marginTop: theme.spacing.xl },
});
