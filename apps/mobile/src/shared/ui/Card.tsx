// apps/mobile/src/shared/ui/Card.tsx
import { StyleSheet, View } from 'react-native';
import type { ReactNode } from 'react';

import { theme } from '@/core/theme';

export function Card({ children }: { children: ReactNode }) {
  return <View style={styles.card}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    gap: theme.spacing.sm,
  },
});
