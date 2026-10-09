// apps/mobile/src/core/navigation/studentTabs.ts
import type { TranslationKey } from '@mastara/i18n';

import type { IconName } from '@/shared/ui';

export interface StudentTab {
  /** File name under app/(tabs)/. */
  name: 'home' | 'course' | 'progress' | 'profile';
  labelKey: TranslationKey;
  icon: IconName;
}

/** Bottom navigation. To add a tab: add a route file, an entry here, and a label key. */
export const STUDENT_TABS: readonly StudentTab[] = [
  { name: 'home', labelKey: 'nav.home', icon: 'home' },
  { name: 'course', labelKey: 'nav.course', icon: 'course' },
  { name: 'progress', labelKey: 'nav.progress', icon: 'progress' },
  { name: 'profile', labelKey: 'nav.profile', icon: 'profile' },
];
