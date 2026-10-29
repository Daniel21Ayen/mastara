// apps/mobile/src/shared/ui/LockedContentSheet.tsx
import { useRouter } from 'expo-router';
import { View } from 'react-native';

import { useI18n } from '@/core/i18n';
import { useSession } from '@/core/session';
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
  const { user, isGuest } = useSession();

  const isAmharic = language === 'am';
  const hasActiveBundle = Boolean(user?.id && user.id.startsWith('MS'));

  const title = isAmharic ? 'የተቆለፈ ይዘት' : 'Locked Content';

  const handlePurchase = () => {
    onClose();
    // PAY-02: bundles for a student with no bundle, single courses for a student with an active bundle
    if (courseId && hasActiveBundle) {
      router.push({ pathname: '/store', params: { courseId } });
    } else {
      router.push('/store');
    }
  };

  const handleSignIn = () => {
    onClose();
    router.replace('/login');
  };

  // Guest or unauthenticated user: prompt to buy (registration happens after payment approval)
  if (isGuest || !user) {
    return (
      <BottomSheet visible={visible} title={title} titleColor={theme.colors.danger} onClose={onClose}>
        <View style={styles.container}>
          <View style={styles.iconCircle}>
            <Icon name="lock" size={32} color={theme.colors.danger} />
          </View>

          <AppText variant="body" style={styles.description}>
            {reason || (isAmharic
              ? 'ይህን ይዘት ለማነብ ኮርስ ይግዙ። ምዝገባ ከክፍያ ማረጋገጫ በኋላ ይከናወናል።'
              : courseTitle
                ? `Purchase a bundle to access "${courseTitle}". Your account is created after payment approval.`
                : "Purchase a course bundle to unlock this content. Your account is created after payment approval.")}
          </AppText>

          <View style={styles.buttons}>
            <AppButton
              label={isAmharic ? 'ኮርስ ቦርሳ ይግዙ' : 'Buy a Course Bundle'}
              variant="primary"
              onPress={handlePurchase}
            />
            <AppButton
              label={isAmharic ? 'መለያ አለዎት? ይግቡ' : 'Already have an account? Sign In'}
              variant="outline"
              onPress={handleSignIn}
            />
            <AppButton label={isAmharic ? 'ዝጋ' : 'Dismiss'} variant="outline" onPress={onClose} />
          </View>
        </View>
      </BottomSheet>
    );
  }

  // Authenticated student: prompt to go to the store
  const description = isAmharic
    ? 'ይህን ይዘት መከፈት አይችሉም።'
    : courseTitle
      ? `You need to purchase "${courseTitle}" to access this content.`
      : 'You need to purchase this course to access its content.';

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
          <AppButton
            label={isAmharic ? 'ኮርሱን ይግዙ' : 'Purchase Course'}
            variant="primary"
            onPress={handlePurchase}
          />
          <AppButton
            label={isAmharic ? 'ዝጋ' : 'Dismiss'}
            variant="outline"
            onPress={onClose}
          />
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
