// apps/mobile/src/shared/ui/Screen.tsx
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { ReactNode } from 'react';

import { theme } from '@/core/theme';

interface ScreenProps {
  children: ReactNode;
  scroll?: boolean;
  /** True on screens shown above the bottom tab bar (it already handles the bottom inset). */
  inTabs?: boolean;
}

export function Screen({ children, scroll = false, inTabs = false }: ScreenProps) {
  return (
    <SafeAreaView
      style={styles.safe}
      edges={inTabs ? ['top', 'left', 'right'] : ['top', 'bottom', 'left', 'right']}
    >
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {scroll ? (
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            {children}
          </ScrollView>
        ) : (
          <View style={[styles.flex, styles.content]}>{children}</View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background },
  flex: { flex: 1 },
  content: { padding: theme.spacing.lg, gap: theme.spacing.md },
});
