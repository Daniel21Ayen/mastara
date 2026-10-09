// apps/mobile/src/modules/exams/components/ExamRow.tsx
import type { Exam, University } from '@mastara/contracts';
import { Pressable, StyleSheet, View } from 'react-native';

import { useI18n } from '@/core/i18n';
import { theme } from '@/core/theme';
import { AppText, Badge, Icon } from '@/shared/ui';

interface ExamRowProps {
  exam: Exam;
  university: University;
  open: boolean;
  onPress: (exam: Exam, open: boolean) => void;
}

export function ExamRow({ exam, university, open, onPress }: ExamRowProps) {
  const { t } = useI18n();
  const kindLabel = t(`exams.tab.${exam.kind.toLowerCase() as 'mid' | 'final' | 'mock'}`);

  let trailing;
  if (!open) trailing = <Icon name="lock" color={theme.colors.danger} />;
  else if (exam.isFree) trailing = <Badge label={t('exams.sample')} />;
  else trailing = <Icon name="chevron" color={theme.colors.textMuted} />;

  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => onPress(exam, open)}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <View style={styles.logo}>
        <AppText bold color={theme.colors.primary}>
          {university.shortName.slice(0, 2).toUpperCase()}
        </AppText>
      </View>
      <View style={styles.text}>
        <AppText bold>{`${university.shortName} (${kindLabel})`}</AppText>
        <AppText variant="caption" muted>
          {university.name}
        </AppText>
      </View>
      {trailing}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  pressed: { opacity: 0.85 },
  logo: {
    width: 48,
    height: 48,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: { flex: 1, gap: 2 },
});
