// apps/mobile/src/shared/ui/TopBar.tsx
import { Pressable, View } from 'react-native';
import type { ReactNode } from 'react';

import { useI18n } from '@/core/i18n';
import { createStyles, useTheme } from '@/core/theme';

import { AppText } from './AppText';
import { Icon } from './Icon';

interface TopBarProps {
  title: string;
  onBack: () => void;
  /** Optional element on the right, for example an icon button. */
  right?: ReactNode;
}

export function TopBar({ title, onBack, right }: TopBarProps) {
  const theme = useTheme();
  const styles = useStyles();
  const { t } = useI18n();

  return (
    <View style={styles.row}>
      <Pressable accessibilityRole="button" accessibilityLabel={t('common.back')} onPress={onBack} style={styles.back}>
        <Icon name="back" size={24} color={theme.colors.text} />
      </Pressable>
      <AppText variant="heading" numberOfLines={1} style={styles.title} accessibilityRole="header">
        {title}
      </AppText>
      {right}
    </View>
  );
}

const useStyles = createStyles((theme) => ({
  row: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs },
  back: {
    width: theme.minTouchTarget,
    height: theme.minTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { flex: 1 },
}));
