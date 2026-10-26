// apps/mobile/src/shared/ui/LockedContentSheet.tsx
import { useRouter } from 'expo-router';
import { View } from 'react-native';

import { useI18n } from '@/core/i18n';
import { createStyles, useTheme } from '@/core/theme';
import { AppButton } from './AppButton';
import { AppText } from './AppText';
import { BottomSheet } from './BottomSheet';
import { Icon } from './Icon';

export interface LockedContentSheetProps {
  visible: boolean;
  onClose: () => void;
  courseId?: string | null;
  courseTitle?: string;
  reason?: string;
}

export function LockedContentSheet({
  visible,
  onClose,
  courseId,
  courseTitle,
  reason,
}: LockedContentSheetProps) {
  const router = useRouter();
  const theme = useTheme();
  const styles = useStyles();
  const { language } = useI18n();

  const isAmharic = language === 'am';

  const title = isAmharic ? 'የተቆለፈ ይዘት' : 'Locked Content';
  const description = isAmharic
    ? 'ይህን ይዘት መከፈት አይችሉም።'
    : courseTitle
      ? `You cannot access this content for "${courseTitle}".`
      : 'You cannot access this content.';

  const purchaseLabel = isAmharic ? 'ከዮርሱን ይግዙ' : 'Purchase Course';
  const dismissLabel = isAmharic ? 'ዝጋ' : 'Dismiss';

  const handlePurchase = () => {
    onClose();
    if (courseId) {
      router.push({ pathname: '/store', params: { courseId } });
    } else {
      router.push('/store');
    }
  };

  return (
    <BottomSheet visible={visible} title={title} titleColor={theme.colors.danger} onClose={onClose}>
      <View style={styles.container}>
        <View style={styles.iconCircle}>
          <Icon name="lock" size={32} color={theme.colors.danger} />
        </View>

        <AppText variant="body" style={styles.description}>
          {reason || description}
        </AppText>

        <View style={styles.buttons}>
          <AppButton label={purchaseLabel} variant="primary" onPress={handlePurchase} />
          <AppButton label={dismissLabel} variant="outline" onPress={onClose} />
        </View>
      </View>
    </BottomSheet>
  );
}

const useStyles = createStyles((theme) => ({
  container: {
    gap: theme.spacing.lg,
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: theme.colors.dangerSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  description: {
    textAlign: 'center',
    color: theme.colors.text,
    lineHeight: 22,
    paddingHorizontal: theme.spacing.md,
  },
  buttons: {
    width: '100%',
    gap: theme.spacing.sm,
  },
}));
