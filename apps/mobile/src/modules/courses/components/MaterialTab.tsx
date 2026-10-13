// apps/mobile/src/modules/courses/components/MaterialTab.tsx
import type { Topic } from '@mastara/contracts';
import type { AccessState, ContentKind, ContentLang } from '@mastara/domain';
import type { TranslationKey } from '@mastara/i18n';
import type { Href } from 'expo-router';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { useI18n } from '@/core/i18n';
import { createStyles, useTheme } from '@/core/theme';
import { LockedSheet } from '@/modules/access';
import { AppText, ErrorNotice, IconTile, UnderlineTabs } from '@/shared/ui';
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
}

export function MaterialTab({ courseId, access }: MaterialTabProps) {
  const theme = useTheme();
  const styles = useStyles();
  const { t } = useI18n();
  const router = useRouter();
  const [tab, setTab] = useState<MaterialTabId>('MODULES');
  const [lockedOpen, setLockedOpen] = useState(false);

  const config = TAB_CONFIG[tab];
  const { topics, loading, error, reload } = useTopics(courseId, config.kind);

  const options: UnderlineTabOption<MaterialTabId>[] = TAB_ORDER.map((id) => ({
    value: id,
    label: t(TAB_CONFIG[id].tab),
  }));

  function openTopic(topic: Topic, open: boolean) {
    if (!open) {
      setLockedOpen(true);
      return;
    }
    router.push(`/reader/${topic.id}?lang=${config.lang}` as Href);
  }

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

      {loading ? <ActivityIndicator color={theme.colors.primary} /> : null}
      {error ? <ErrorNotice error={error} onRetry={reload} /> : null}
      {!loading && !error && topics.length === 0 ? <AppText muted>{t('material.empty')}</AppText> : null}

      {topics.map((topic) => (
        <TopicRow key={topic.id} topic={topic} lang={config.lang} access={access} onPress={openTopic} />
      ))}

      <LockedSheet visible={lockedOpen} onClose={() => setLockedOpen(false)} />
    </View>
  );
}

const useStyles = createStyles((theme) => ({
  wrap: { gap: theme.spacing.md },
  intro: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md },
  text: { flex: 1, gap: 2 },
}));
