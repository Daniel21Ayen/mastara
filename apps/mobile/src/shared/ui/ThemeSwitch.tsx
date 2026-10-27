// // apps/mobile/src/shared/ui/ThemeSwitch.tsx
// import { useI18n } from '@/core/i18n';
// import { useThemePreference } from '@/core/theme';
// import type { ThemePreference } from '@/core/theme';

// import { SegmentedControl } from './SegmentedControl';
// import type { SegmentOption } from './SegmentedControl';

// /** Light / Dark / Auto (follow the phone). The choice is remembered and applies to every page at once. */
// export function ThemeSwitch() {
//   const { t } = useI18n();
//   const { preference, setPreference } = useThemePreference();

//   const options: SegmentOption<ThemePreference>[] = [
//     { value: 'light', label: t('theme.light') },
//     { value: 'dark', label: t('theme.dark') },
//     { value: 'system', label: t('theme.system') },
//   ];

//   return <SegmentedControl options={options} value={preference} onChange={setPreference} />;
// }

// apps/mobile/src/shared/ui/ThemeSwitch.tsx
import { StyleSheet, Switch, View } from 'react-native';

import { useI18n } from '@/core/i18n';
import { useTheme, useThemePreference } from '@/core/theme';

import { AppText } from './AppText';

/** Dark mode on/off. One switch, remembered, and it repaints every screen at once. */
export function ThemeSwitch() {
  const { t } = useI18n();
  const theme = useTheme();
  const { scheme, setPreference } = useThemePreference();
  const isDark = scheme === 'dark';

  return (
    <View style={styles.row}>
      <AppText style={styles.label}>{t('theme.dark')}</AppText>
      <Switch
        value={isDark}
        onValueChange={(on) => setPreference(on ? 'dark' : 'light')}
        trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
        thumbColor={theme.colors.surface}
        ios_backgroundColor={theme.colors.border}
        accessibilityRole="switch"
        accessibilityLabel={t('theme.dark')}
        accessibilityState={{ checked: isDark }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  label: { flex: 1 },
});