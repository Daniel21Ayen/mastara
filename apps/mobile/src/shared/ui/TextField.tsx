import { useState } from 'react';
import { TextInput, View } from 'react-native';
import type { KeyboardTypeOptions, TextInputProps } from 'react-native';

import { useI18n } from '@/core/i18n';
import { createStyles, useTheme } from '@/core/theme';

import { AppText } from './AppText';

export interface TextFieldProps {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  error?: string | undefined;
  placeholder?: string;
  secureTextEntry?: boolean;
  keyboardType?: KeyboardTypeOptions;
  autoCapitalize?: TextInputProps['autoCapitalize'];
  /** False for a read-only answer (review). */
  editable?: boolean;
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
  editable = true,
}: TextFieldProps) {
  const theme = useTheme();
  const styles = useStyles();
  const { language } = useI18n();
  const [focused, setFocused] = useState(false);
  const family = language === 'am' ? theme.fontFamily.ethiopic : theme.fontFamily.sans;

  return (
    <View style={styles.wrap}>
      <AppText bold>{label}</AppText>
      <TextInput
        accessibilityLabel={label}
        value={value}
        editable={editable}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.textMuted}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        autoCorrect={false}
        style={[
          styles.input,
          { fontFamily: family.regular },
          focused ? styles.inputFocused : null,
          error ? styles.inputError : null,
        ]}
      />
      {error ? (
        <AppText variant="caption" color={theme.colors.danger} accessibilityLiveRegion="polite">
          {error}
        </AppText>
      ) : null}
    </View>
  );
}

const useStyles = createStyles((theme) => ({
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
  inputFocused: {
    borderColor: theme.colors.primary,
    borderWidth: 1.5,
  },
  inputError: { borderColor: theme.colors.danger, borderWidth: 2 },
}));
