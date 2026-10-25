import { Alert, View } from 'react-native';

import { useI18n } from '@/core/i18n';
import { useSession } from '@/core/session';
import { createStyles, useTheme } from '@/core/theme';
import { AppButton, AppText, Card, Icon, Screen } from '@/shared/ui';

/** Full-screen block: no app content is reachable while the account is bound to another phone. */
export function DeviceLockedScreen() {
  const theme = useTheme();
  const styles = useStyles();
  const { t } = useI18n();
  const { signOut } = useSession();

  return (
    <Screen scroll>
      <Card>
        <View style={styles.header}>
          <Icon name="lock" color={theme.colors.danger} size={28} />
          <AppText variant="heading" color={theme.colors.danger} accessibilityRole="header">
            {t('device.locked.title')}
          </AppText>
        </View>
        <AppText variant="bodyLarge" color={theme.colors.text}>
          {t('device.locked.body')}
        </AppText>
      </Card>
      <AppButton
        label={t('device.locked.contact')}
        variant="outline"
        onPress={() => Alert.alert(t('device.locked.contact'), t('device.locked.contactInfo'))}
      />
      <AppButton label="Release Device & Log Out" variant="primary" onPress={signOut} />
    </Screen>
  );
}

const useStyles = createStyles((theme) => ({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.xs,
  },
}));
