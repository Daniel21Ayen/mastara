// apps/mobile/src/shared/ui/ErrorNotice.tsx
import { ERROR_CODES } from '@mastara/domain';
import type { TranslationKey } from '@mastara/i18n';

import { useI18n } from '@/core/i18n';
import { isApiError } from '@/core/network';

import { AppButton } from './AppButton';
import { AppText } from './AppText';

function messageKey(error: Error): TranslationKey {
  if (isApiError(error, ERROR_CODES.CONTENT_NOT_DOWNLOADED)) return 'error.notDownloaded';
  if (isApiError(error, ERROR_CODES.NETWORK_OFFLINE)) return 'error.offline';
  return 'error.generic';
}

/** Says what went wrong in plain words (offline, not downloaded, or generic) with a Try again button. */
export function ErrorNotice({ error, onRetry }: { error: Error; onRetry: () => void }) {
  const { t } = useI18n();
  return (
    <>
      <AppText muted accessibilityRole="alert">
        {t(messageKey(error))}
      </AppText>
      <AppButton label={t('common.retry')} variant="outline" onPress={onRetry} />
    </>
  );
}
