// apps/mobile/src/shared/ui/ThemeSwitch.tsx
import { useI18n } from '@/core/i18n';
import { useThemePreference } from '@/core/theme';
import type { ThemePreference } from '@/core/theme';

import { SegmentedControl } from './SegmentedControl';
import type { SegmentOption } from './SegmentedControl';

/** Light / Dark / Auto (follow the phone). The choice is remembered and applies to every page at once. */
export function ThemeSwitch() {
  const { t } = useI18n();
  const { preference, setPreference } = useThemePreference();

  const options: SegmentOption<ThemePreference>[] = [
    { value: 'light', label: t('theme.light') },
    { value: 'dark', label: t('theme.dark') },
    { value: 'system', label: t('theme.system') },
  ];

  return <SegmentedControl options={options} value={preference} onChange={setPreference} />;
}
