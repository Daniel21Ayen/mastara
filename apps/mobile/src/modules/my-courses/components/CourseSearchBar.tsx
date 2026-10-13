// apps/mobile/src/modules/my-courses/components/CourseSearchBar.tsx
import { Pressable, TextInput, View } from 'react-native';

import { useI18n } from '@/core/i18n';
import { createStyles, useTheme } from '@/core/theme';
import { AppText, Icon } from '@/shared/ui';

interface CourseSearchBarProps {
  value: string;
  onChangeText: (value: string) => void;
  activeFilters: number;
  onFilterPress: () => void;
}

export function CourseSearchBar({ value, onChangeText, activeFilters, onFilterPress }: CourseSearchBarProps) {
  const theme = useTheme();
  const styles = useStyles();
  const { t, language } = useI18n();
  const family = language === 'am' ? theme.fontFamily.ethiopic : theme.fontFamily.sans;

  return (
    <View style={styles.row}>
      <View style={styles.field}>
        <Icon name="search" color={theme.colors.textMuted} />
        <TextInput
          accessibilityLabel={t('mycourses.search')}
          placeholder={t('mycourses.search')}
          placeholderTextColor={theme.colors.textMuted}
          value={value}
          onChangeText={onChangeText}
          autoCorrect={false}
          returnKeyType="search"
          style={[styles.input, { fontFamily: family.regular }]}
        />
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('mycourses.filter')}
        onPress={onFilterPress}
        style={styles.filter}
      >
        <Icon name="filter" color={theme.colors.primary} size={22} />
        {activeFilters > 0 ? (
          <View style={styles.count}>
            <AppText variant="caption" bold color={theme.colors.onPrimary}>
              {activeFilters}
            </AppText>
          </View>
        ) : null}
      </Pressable>
    </View>
  );
}

const useStyles = createStyles((theme) => ({
  row: { flexDirection: 'row', gap: theme.spacing.sm },
  field: {
    flex: 1,
    minHeight: theme.minTouchTarget,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: theme.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  input: { flex: 1, fontSize: theme.fontSize.bodyLarge, color: theme.colors.text },
  filter: {
    width: theme.minTouchTarget,
    height: theme.minTouchTarget,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  count: {
    position: 'absolute',
    top: 4,
    right: 4,
    minWidth: 18,
    height: 18,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
}));
