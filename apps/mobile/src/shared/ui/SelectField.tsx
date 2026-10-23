// apps/mobile/src/shared/ui/SelectField.tsx
import { useState } from 'react';
import { FlatList, Pressable, View } from 'react-native';

import { createStyles, useTheme } from '@/core/theme';

import { AppText } from './AppText';
import { BottomSheet } from './BottomSheet';

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectFieldProps {
  label: string;
  placeholder: string;
  options: readonly SelectOption[];
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  loading?: boolean;
  error?: string;
}

export function SelectField({
  label,
  placeholder,
  options,
  value,
  onChange,
  disabled = false,
  loading = false,
  error,
}: SelectFieldProps) {
  const theme = useTheme();
  const styles = useStyles();
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.value === value);
  const inactive = disabled || loading;

  return (
    <View style={styles.wrap}>
      <AppText bold>{label}</AppText>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ disabled: inactive }}
        disabled={inactive}
        onPress={() => setOpen(true)}
        style={[styles.field, inactive && styles.inactive, error ? styles.fieldError : null]}
      >
        <AppText color={selected ? theme.colors.text : theme.colors.textMuted} style={styles.fieldText}>
          {selected ? selected.label : placeholder}
        </AppText>
        <AppText color={theme.colors.textMuted}>▾</AppText>
      </Pressable>
      {error ? (
        <AppText variant="caption" color={theme.colors.danger}>
          {error}
        </AppText>
      ) : null}

      <BottomSheet visible={open} title={label} onClose={() => setOpen(false)}>
        <FlatList
          data={options}
          keyExtractor={(option) => option.value}
          renderItem={({ item }) => (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: item.value === value }}
              onPress={() => {
                onChange(item.value);
                setOpen(false);
              }}
              style={[styles.option, item.value === value && styles.optionActive]}
            >
              <AppText bold={item.value === value}>{item.label}</AppText>
            </Pressable>
          )}
          ListEmptyComponent={
            <View style={{ padding: theme.spacing.md, alignItems: 'center' }}>
              <AppText muted>No options available</AppText>
            </View>
          }
        />
      </BottomSheet>
    </View>
  );
}

const useStyles = createStyles((theme) => ({
  wrap: { gap: theme.spacing.xs },
  field: {
    minHeight: theme.minTouchTarget,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  fieldError: { borderColor: theme.colors.danger, borderWidth: 2 },
  fieldText: { flex: 1 },
  inactive: { opacity: 0.5 },
  option: { minHeight: theme.minTouchTarget, justifyContent: 'center', paddingHorizontal: theme.spacing.sm, borderRadius: theme.radius.sm },
  optionActive: { backgroundColor: theme.colors.primarySoft },
}));
