// apps/mobile/src/shared/hooks/useComingSoon.ts
import { useCallback } from 'react';
import { Alert } from 'react-native';

import { useI18n } from '@/core/i18n';

/** Handler for controls whose screens arrive in a later phase. Remove usages as phases land. */
export function useComingSoon(): () => void {
  const { t } = useI18n();
  return useCallback(() => Alert.alert(t('common.comingSoon')), [t]);
}
