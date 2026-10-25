// apps/mobile/src/modules/exams/components/QuestionPalette.tsx
import type { PaletteCell } from '@mastara/domain';
import { Pressable, View } from 'react-native';

import { useI18n } from '@/core/i18n';
import { createStyles, useTheme } from '@/core/theme';
import { AppText } from '@/shared/ui';

interface QuestionPaletteProps {
  cells: readonly PaletteCell[];
  onSelect: (index: number) => void;
}

/** "All questions": one numbered cell per question. Filled = answered, red ring = flagged, thick blue ring = current. */
export function QuestionPalette({ cells, onSelect }: QuestionPaletteProps) {
  const theme = useTheme();
  const styles = useStyles();
  const { t } = useI18n();

  return (
    <View style={styles.wrap}>
      <View style={styles.grid}>
        {cells.map((cell, index) => {
          const label = [
            t('exam.cell', { n: cell.number }),
            cell.answered ? t('exam.legend.answered') : t('exam.legend.open'),
            cell.flagged ? t('exam.legend.flagged') : null,
          ]
            .filter(Boolean)
            .join(', ');

          return (
            <Pressable
              key={cell.number}
              accessibilityRole="button"
              accessibilityLabel={label}
              onPress={() => onSelect(index)}
              style={[
                styles.cell,
                cell.current ? styles.current : cell.answered ? styles.answered : styles.open,
                cell.flagged && styles.flagged,
              ]}
            >
              <AppText bold color={cell.current ? theme.colors.onPrimary : theme.colors.text}>
                {cell.number}
              </AppText>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.legend}>
        <LegendItem style={styles.current} label={t('exam.cell', { n: 1 })} />
        <LegendItem style={styles.answered} label={t('exam.legend.answered')} />
        <LegendItem style={[styles.open, styles.legendOpen]} label={t('exam.legend.open')} />
        <LegendItem style={[styles.open, styles.flagged]} label={t('exam.legend.flagged')} />
      </View>
    </View>
  );
}

function LegendItem({ style, label }: { style: object; label: string }) {
  const styles = useStyles();
  return (
    <View style={styles.legendItem}>
      <View style={[styles.swatch, style]} />
      <AppText variant="caption" muted>
        {label}
      </AppText>
    </View>
  );
}

const useStyles = createStyles((theme) => ({
  wrap: { gap: theme.spacing.lg },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm },
  cell: {
    width: 48,
    height: 48,
    borderRadius: theme.radius.pill,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  current: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  answered: { backgroundColor: theme.colors.primarySoft, borderColor: theme.colors.primary },
  open: { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
  flagged: { borderColor: theme.colors.danger },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.lg },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs },
  legendOpen: {},
  swatch: { width: 16, height: 16, borderRadius: theme.radius.sm, borderWidth: 2 },
}));
