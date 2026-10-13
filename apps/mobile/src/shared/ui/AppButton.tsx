// apps/mobile/src/shared/ui/AppButton.tsx
import { ActivityIndicator, Pressable } from 'react-native';

import { createStyles, useTheme } from '@/core/theme';

import { AppText } from './AppText';

interface AppButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'outline';
  disabled?: boolean;
  loading?: boolean;
}

export function AppButton({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
}: AppButtonProps) {
  const theme = useTheme();
  const styles = useStyles();
  const isPrimary = variant === 'primary';
  const inactive = disabled || loading;
  const textColor = isPrimary ? theme.colors.onPrimary : theme.colors.primary;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: inactive, busy: loading }}
      disabled={inactive}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        isPrimary ? styles.primary : styles.outline,
        inactive && styles.inactive,
        pressed && styles.pressed,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <AppText bold color={textColor}>
          {label}
        </AppText>
      )}
    </Pressable>
  );
}

const useStyles = createStyles((theme) => ({
  base: {
    minHeight: theme.minTouchTarget,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  primary: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  outline: { backgroundColor: theme.colors.surface, borderColor: theme.colors.primary },
  inactive: { opacity: 0.5 },
  pressed: { opacity: 0.85 },
}));
