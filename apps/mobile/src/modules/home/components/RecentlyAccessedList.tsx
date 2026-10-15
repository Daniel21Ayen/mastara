// apps/mobile/src/modules/home/components/RecentlyAccessedList.tsx
import type { RecentItem } from '@mastara/contracts';
import { View } from 'react-native';

import { useI18n } from '@/core/i18n';
import { createStyles } from '@/core/theme';
import { useTimeAgo } from '@/shared/hooks';
import { AppText, ListRow, SectionHeader } from '@/shared/ui';
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
        items.map((item) => (
          <ListRow
            key={item.id}
            icon={ICON_BY_KIND[item.kind]}
            title={item.title}
            subtitle={describe(item)}
            onPress={() => onItemPress(item)}
          />
        ))
      )}
    </View>
  );
}

const useStyles = createStyles((theme) => ({
  wrap: { gap: theme.spacing.sm },
}));
