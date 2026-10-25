// apps/mobile/src/shared/ui/NeedsInternetSheet.tsx
import { View } from 'react-native';

import { useI18n } from '@/core/i18n';
import { createStyles, useTheme } from '@/core/theme';
import { AppButton } from './AppButton';
import { AppText } from './AppText';
import { BottomSheet } from './BottomSheet';
import { Icon } from './Icon';

export interface NeedsInternetSheetProps {
  visible: boolean;
  onClose: () => void;
  message?: string;
}

export function NeedsInternetSheet({
  visible,
  onClose,
  message,
}: NeedsInternetSheetProps) {
  const theme = useTheme();
  const styles = useStyles();
  const { t, language } = useI18n();

  const title = t('access.needsInternet.title');
  const defaultBody = t('access.needsInternet.body');
  const dismissLabel = language === 'am' ? 'እሺ' : 'Got It';

  return (
    <BottomSheet visible={visible} title={title} titleColor={theme.colors.primary} onClose={onClose}>
      <View style={styles.container}>
        <View style={styles.iconCircle}>
          <Icon name="wifiOff" size={32} color={theme.colors.primary} />
        </View>

        <AppText variant="body" style={styles.description}>
          {message || defaultBody}
        </AppText>

        <View style={styles.buttons}>
          <AppButton label={dismissLabel} variant="primary" onPress={onClose} />
        </View>
      </View>
    </BottomSheet>
  );
}

const useStyles = createStyles((theme) => ({
  container: {
    gap: theme.spacing.lg,
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: theme.colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  description: {
    textAlign: 'center',
    color: theme.colors.text,
    lineHeight: 22,
    paddingHorizontal: theme.spacing.md,
  },
  buttons: {
    width: '100%',
    gap: theme.spacing.sm,
  },
}));
