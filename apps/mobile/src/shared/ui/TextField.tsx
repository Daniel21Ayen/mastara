// apps/mobile/src/shared/ui/TextField.tsx
import { StyleSheet, TextInput, View } from 'react-native';
import type { KeyboardTypeOptions, TextInputProps } from 'react-native';

import { useI18n } from '@/core/i18n';
import { theme } from '@/core/theme';

import { AppText } from './AppText';

export interface TextFieldProps {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  error?: string;
  placeholder?: string;
  secureTextEntry?: boolean;
  keyboardType?: KeyboardTypeOptions;
  autoCapitalize?: TextInputProps['autoCapitalize'];
}

export function TextField({
  label,
  value,
  onChangeText,
  error,
  placeholder,
  secureTextEntry,
  keyboardType,
  autoCapitalize = 'none',
}: TextFieldProps) {
  const { language } = useI18n();
  const family = language === 'am' ? theme.fontFamily.ethiopic : theme.fontFamily.sans;

  return (
    <View style={styles.wrap}>
      <AppText bold>{label}</AppText>
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.textMuted}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        autoCorrect={false}
        style={[styles.input, { fontFamily: family.regular }, error ? styles.inputError : null]}
      />
      {error ? (
        <AppText variant="caption" color={theme.colors.danger} accessibilityLiveRegion="polite">
          {error}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: theme.spacing.xs },
  input: {
    minHeight: theme.minTouchTarget,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing.md,
    fontSize: theme.fontSize.bodyLarge,
    color: theme.colors.text,
  },
  inputError: { borderColor: theme.colors.danger, borderWidth: 2 },
});
