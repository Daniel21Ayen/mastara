// apps/mobile/src/shared/ui/Card.tsx
import { View } from 'react-native';
import type { ReactNode } from 'react';

import { createStyles } from '@/core/theme';

export function Card({ children }: { children: ReactNode }) {
  const styles = useStyles();
  return <View style={styles.card}>{children}</View>;
}

const useStyles = createStyles((theme) => ({
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.lg,
    gap: theme.spacing.sm,
  },
}));
