// apps/mobile/src/core/navigation/studentTabs.ts
import type { TranslationKey } from '@mastara/i18n';

import type { AccentName } from '@/core/theme';
import type { IconName } from '@/shared/ui';

export interface StudentTab {
  /** File name under app/(tabs)/. */
  name: 'home' | 'course' | 'progress' | 'profile';
  labelKey: TranslationKey;
  icon: IconName;
  /** Colour of the tab when selected. Each tab has its own. */
  accent: AccentName;
}

/** Bottom navigation. To add a tab: add a route file, an entry here, and a label key. */
export const STUDENT_TABS: readonly StudentTab[] = [
  { name: 'home', labelKey: 'nav.home', icon: 'home', accent: 'blue' },
  { name: 'course', labelKey: 'nav.course', icon: 'course', accent: 'violet' },
  { name: 'progress', labelKey: 'nav.progress', icon: 'progress', accent: 'emerald' },
  { name: 'profile', labelKey: 'nav.profile', icon: 'profile', accent: 'orange' },
];
