// apps/mobile/src/shared/ui/OfflineBanner.tsx
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useI18n } from '@/core/i18n';
import { useOnline } from '@/core/network';
import { theme } from '@/core/theme';

import { AppText } from './AppText';

/** A thin bar shown on every screen while the phone is offline. */
export function OfflineBanner() {
  const { t } = useI18n();
  const online = useOnline();
  const insets = useSafeAreaInsets();

  if (online) return null;

  return (
    <View accessibilityRole="alert" style={[styles.bar, { paddingTop: insets.top + theme.spacing.xs }]}>
      <AppText variant="caption" bold color={theme.colors.onPrimary} style={styles.text}>
        {t('offline.banner')}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { backgroundColor: theme.colors.text, paddingBottom: theme.spacing.xs, paddingHorizontal: theme.spacing.md },
  text: { textAlign: 'center' },
});
