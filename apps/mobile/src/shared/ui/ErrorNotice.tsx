import { ERROR_CODES } from '@mastara/domain';
import type { TranslationKey } from '@mastara/i18n';
import { View } from 'react-native';

import { useI18n } from '@/core/i18n';
import { isApiError } from '@/core/network';
import { createStyles, useTheme } from '@/core/theme';

import { AppButton } from './AppButton';
import { AppText } from './AppText';
import { Icon } from './Icon';

function messageKey(error: Error): TranslationKey {
  if (isApiError(error, ERROR_CODES.CONTENT_NOT_DOWNLOADED)) return 'error.notDownloaded';
  if (isApiError(error, ERROR_CODES.NETWORK_OFFLINE)) return 'error.offline';
  return 'error.generic';
}

/** Says what went wrong in plain words (offline, not downloaded, or generic) with a Try again button. */
export function ErrorNotice({ error, onRetry }: { error: Error; onRetry: () => void }) {
  const theme = useTheme();
  const styles = useStyles();
  const { t } = useI18n();

  return (
    <View style={styles.card} accessibilityRole="alert">
      <View style={styles.header}>
        <View style={styles.iconCircle}>
          <Icon name="close" size={16} color={theme.colors.danger} />
        </View>
        <AppText style={styles.text}>{t(messageKey(error))}</AppText>
      </View>
      <AppButton label={t('common.retry')} variant="outline" onPress={onRetry} />
    </View>
  );
}

const useStyles = createStyles((theme) => ({
  card: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  iconCircle: {
    width: 28,
    height: 28,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.dangerSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    flex: 1,
    color: theme.colors.text,
  },
}));
