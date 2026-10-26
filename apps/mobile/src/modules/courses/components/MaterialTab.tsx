// apps/mobile/src/modules/courses/components/MaterialTab.tsx
import type { Course, Topic } from '@mastara/contracts';
import { resolveOpen } from '@mastara/domain';
import type { AccessState, ContentKind, ContentLang } from '@mastara/domain';
import type { TranslationKey } from '@mastara/i18n';
import type { Href } from 'expo-router';
import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { useI18n } from '@/core/i18n';
import { useOnline } from '@/core/network';
import { createStyles, useTheme } from '@/core/theme';
import { LockedContentSheet, NeedsInternetSheet, AppText, ErrorNotice, IconTile, UnderlineTabs } from '@/shared/ui';
import { useDownloadedIds } from '@/modules/downloads';
import type { IconName, UnderlineTabOption } from '@/shared/ui';

import { useTopics } from '../hooks/useTopics';
import { TopicRow } from './TopicRow';

type MaterialTabId = 'MODULES' | 'NOTES' | 'AMHARIC';

interface TabConfig {
  kind: ContentKind;
  /** The language of this tab. The lesson page opens in this language only; there is no language switch inside it. */
  lang: ContentLang;
  icon: IconName;
  tab: TranslationKey;
  title: TranslationKey;
  subtitle: TranslationKey;
}

/**
 * Add a lower tab here and it appears in the UI. Notes and Amharic Notes are two views of the same bilingual records:
 * each tab opens the lesson in its own language only.
 */
const TAB_CONFIG: Record<MaterialTabId, TabConfig> = {
  MODULES: { kind: 'MODULE', lang: 'en', icon: 'module', tab: 'material.tab.modules', title: 'material.modules.title', subtitle: 'material.modules.sub' },
  NOTES: { kind: 'NOTE', lang: 'en', icon: 'note', tab: 'material.tab.notes', title: 'material.notes.title', subtitle: 'material.notes.sub' },
  AMHARIC: { kind: 'NOTE', lang: 'am', icon: 'language', tab: 'material.tab.amharic', title: 'material.amharic.title', subtitle: 'material.amharic.sub' },
};

const TAB_ORDER: readonly MaterialTabId[] = ['MODULES', 'NOTES', 'AMHARIC'];

interface MaterialTabProps {
  courseId: string;
  access: AccessState;
  course?: Course;
}

export function MaterialTab({ courseId, access, course }: MaterialTabProps) {
  const theme = useTheme();
  const styles = useStyles();
  const { t } = useI18n();
  const online = useOnline();
  const downloadedIds = useDownloadedIds();
  const router = useRouter();
  const [tab, setTab] = useState<MaterialTabId>('MODULES');
  const [lockedOpen, setLockedOpen] = useState(false);
  const [needsInternetOpen, setNeedsInternetOpen] = useState(false);

  const config = TAB_CONFIG[tab];
  const { topics, loading, error, reload } = useTopics(courseId, config.kind);

  const options: UnderlineTabOption<MaterialTabId>[] = TAB_ORDER.map((id) => ({
    value: id,
    label: t(TAB_CONFIG[id].tab),
  }));

  const openTopic = useCallback(
    (topic: Topic) => {
      const isDownloaded =
        downloadedIds.has(`TOPIC:${topic.id}`) || downloadedIds.has(`COURSE:${courseId}`);
      const resolution = resolveOpen({
        access,
        isFree: topic.isFree,
        isDownloaded,
        isOnline: online,
      });

      switch (resolution) {
        case 'LOCKED':
          setLockedOpen(true);
          break;
        case 'OPEN_LOCAL':
        case 'OPEN_ONLINE':
          router.push(`/reader/${topic.id}?lang=${config.lang}` as Href);
          break;
        case 'NEEDS_INTERNET':
          setNeedsInternetOpen(true);
          break;
      }
    },
    [access, config.lang, courseId, downloadedIds, online, router],
  );

  return (
    <View style={styles.wrap}>
      <UnderlineTabs options={options} value={tab} onChange={setTab} />

      <View style={styles.intro}>
        <IconTile icon={config.icon} solid />
        <View style={styles.text}>
          <AppText variant="bodyLarge" bold>
            {t(config.title)}
          </AppText>
          <AppText variant="caption" muted>
            {t(config.subtitle)}
          </AppText>
        </View>
      </View>

      {loading && topics.length === 0 ? <ActivityIndicator color={theme.colors.primary} /> : null}
      {error && topics.length === 0 ? <ErrorNotice error={error} onRetry={reload} /> : null}
      {!loading && !error && topics.length === 0 ? <AppText muted>{t('material.empty')}</AppText> : null}

      {topics.map((topic) => (
        <TopicRow key={topic.id} topic={topic} lang={config.lang} access={access} onPress={openTopic} />
      ))}

      <LockedContentSheet
        visible={lockedOpen}
        courseId={courseId}
        courseTitle={course?.title}
        onClose={() => setLockedOpen(false)}
      />
      <NeedsInternetSheet
        visible={needsInternetOpen}
        onClose={() => setNeedsInternetOpen(false)}
      />
    </View>
  );
}

const useStyles = createStyles((theme) => ({
  wrap: { gap: theme.spacing.md },
  intro: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md },
  text: { flex: 1, gap: 2 },
}));
