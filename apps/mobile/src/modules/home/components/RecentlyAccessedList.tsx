// apps/mobile/src/modules/home/components/RecentlyAccessedList.tsx
import type { RecentItem } from '@mastara/contracts';
import { Pressable, View } from 'react-native';

import { useI18n } from '@/core/i18n';
import { createStyles, useTheme } from '@/core/theme';
import { useTimeAgo } from '@/shared/hooks';
import { AppText, Icon, ListRow, SectionHeader } from '@/shared/ui';
import type { IconName } from '@/shared/ui';

interface RecentlyAccessedListProps {
  items: readonly RecentItem[];
  onSeeAll: () => void;
  onItemPress: (item: RecentItem) => void;
}

const ICON_BY_KIND: Record<RecentItem['kind'], IconName> = {
  TOPIC: 'course',
  NOTE: 'note',
  EXAM: 'exam',
};

export function RecentlyAccessedList({ items, onSeeAll, onItemPress }: RecentlyAccessedListProps) {
  const theme = useTheme();
  const styles = useStyles();
  const { t } = useI18n();
  const timeAgo = useTimeAgo();

  function describe(item: RecentItem): string {
    const label =
      item.kind === 'TOPIC'
        ? t('home.recent.chapter', { n: item.chapterNumber ?? 1 })
        : item.kind === 'NOTE'
          ? t('recent.kind.note')
          : t('recent.kind.exam');
    return `${label} · ${timeAgo(item.accessedAt)}`;
  }

  const [first, ...rest] = items;

  return (
    <View style={styles.wrap}>
      <SectionHeader
        title={t('home.recent.title')}
        actionLabel={items.length > 0 ? t('home.recent.seeAll') : undefined}
        onAction={onSeeAll}
      />
      {items.length === 0 ? (
        <AppText variant="caption" muted>
          {t('home.recent.empty')}
        </AppText>
      ) : (
        <>
          {first ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => onItemPress(first)}
              style={({ pressed }) => [styles.continueCard, pressed && styles.pressed]}
            >
              <View style={styles.continueHeader}>
                <View style={styles.continueIcon}>
                  <Icon name={ICON_BY_KIND[first.kind]} size={22} color={theme.colors.primary} />
                </View>
                <View style={styles.continueText}>
                  <AppText variant="caption" color={theme.colors.onPrimaryMuted}>
                    {t('home.recent.title')}
                  </AppText>
                  <AppText bold variant="bodyLarge" color={theme.colors.onPrimary}>
                    {first.title}
                  </AppText>
                  <AppText variant="caption" color={theme.colors.onPrimaryMuted}>
                    {describe(first)}
                  </AppText>
                </View>
              </View>
            </Pressable>
          ) : null}
          {rest.map((item) => (
            <ListRow
              key={item.id}
              icon={ICON_BY_KIND[item.kind]}
              title={item.title}
              subtitle={describe(item)}
              onPress={() => onItemPress(item)}
            />
          ))}
        </>
      )}
    </View>
  );
}

const useStyles = createStyles((theme) => ({
  wrap: { gap: theme.spacing.sm },
  continueCard: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
  },
  continueHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  continueIcon: {
    width: 44,
    height: 44,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  continueText: {
    flex: 1,
    gap: 2,
  },
  pressed: {
    opacity: 0.88,
  },
}));
