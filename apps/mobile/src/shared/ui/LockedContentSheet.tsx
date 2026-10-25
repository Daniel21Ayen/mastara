// apps/mobile/src/shared/ui/LockedContentSheet.tsx
import { useRouter } from 'expo-router';
import { View } from 'react-native';

import { useI18n } from '@/core/i18n';
import { createStyles, useTheme } from '@/core/theme';
import { AppButton } from './AppButton';
import { AppText } from './AppText';
import { BottomSheet } from './BottomSheet';

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

  const title = isAmharic ? 'ይዘቱ ተቆልፏል' : 'Content Locked';
  const description = isAmharic
    ? courseTitle
      ? `ይህ ይዘት የ${courseTitle} ፕሪሚየም ኮርስ አካል ነው። ሙሉ ትምህርቶችን፣ ሙከራዎችን እና የፈተና ጥያቄዎችን ለመጠቀም ኮርሱን ይግዙ።`
      : 'ይህ ይዘት የፕሪሚየም ኮርስ አካል ነው። ሙሉ ትምህርቶችን፣ ሙከራዎችን እና የፈተና ጥያቄዎችን ለመጠቀም ኮርሱን ይግዙ።'
    : courseTitle
      ? `This content is part of the premium course "${courseTitle}". Unlock full access to all lessons, quizzes, exam papers, and solutions by purchasing this course.`
      : 'This content is part of a premium course. Unlock full access to all lessons, quizzes, exam papers, and solutions by purchasing the course.';

  const purchaseLabel = isAmharic ? 'ኮርሱን ይግዙ' : 'Purchase Course';
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
    <BottomSheet visible={visible} title={title} onClose={onClose}>
      <View style={styles.container}>
        <View style={styles.iconCircle}>
          <AppText style={styles.lockEmoji}>🔒</AppText>
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
    backgroundColor: theme.colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockEmoji: {
    fontSize: 32,
  },
  description: {
    textAlign: 'center',
    color: theme.colors.textMuted,
    lineHeight: 22,
    paddingHorizontal: theme.spacing.md,
  },
  buttons: {
    width: '100%',
    gap: theme.spacing.sm,
  },
}));
