// apps/mobile/src/shared/hooks/useTimeAgo.ts
import { timeAgo } from '@mastara/domain';
import { useCallback } from 'react';

import { useI18n } from '@/core/i18n';

/** Returns a function that turns an ISO date into text such as "2 days ago". */
export function useTimeAgo(): (isoDate: string) => string {
  const { t } = useI18n();

  return useCallback(
    (isoDate: string) => {
      const ago = timeAgo(new Date(isoDate), new Date());
      switch (ago.unit) {
        case 'now':
          return t('time.now');
        case 'minute':
          return t('time.minutes', { n: ago.value });
        case 'hour':
          return t('time.hours', { n: ago.value });
        case 'day':
          return t('time.days', { n: ago.value });
      }
    },
    [t],
  );
}
