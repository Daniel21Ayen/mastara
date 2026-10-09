// apps/mobile/src/modules/courses/components/MaterialTab.tsx
import type { Topic } from '@mastara/contracts';
import type { AccessState, ContentKind, ContentLang } from '@mastara/domain';
import type { TranslationKey } from '@mastara/i18n';
import type { Href } from 'expo-router';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { useI18n } from '@/core/i18n';
import { theme } from '@/core/theme';
import { LockedSheet } from '@/modules/access';
import { AppButton, AppText, Icon, UnderlineTabs } from '@/shared/ui';
import type { IconName, UnderlineTabOption } from '@/shared/ui';

import { useTopics } from '../hooks/useTopics';

import { TopicRow } from './TopicRow';

type MaterialTabId = 'MODULES' | 'NOTES' | 'AMHARIC';

interface TabConfig {
  kind: ContentKind;
  lang: ContentLang;
  icon: IconName;
  tab: TranslationKey;
  title: TranslationKey;
  subtitle: TranslationKey;
}

/** Add a lower tab here and it appears in the UI. Notes and Amharic share the same records. */
const TAB_CONFIG: Record<MaterialTabId, TabConfig> = {
  MODULES: { kind: 'MODULE', lang: 'en', icon: 'module', tab: 'material.tab.modules', title: 'material.modules.title', subtitle: 'material.modules.sub' },
  NOTES: { kind: 'NOTE', lang: 'en', icon: 'note', tab: 'material.tab.notes', title: 'material.notes.title', subtitle: 'material.notes.sub' },
  AMHARIC: { kind: 'NOTE', lang: 'am', icon: 'note', tab: 'material.tab.amharic', title: 'material.amharic.title', subtitle: 'material.amharic.sub' },
};

const TAB_ORDER: readonly MaterialTabId[] = ['MODULES', 'NOTES', 'AMHARIC'];

interface MaterialTabProps {
  courseId: string;
  access: AccessState;
}

export function MaterialTab({ courseId, access }: MaterialTabProps) {
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
        <View style={styles.tile}>
          <Icon name={config.icon} color={theme.colors.primary} />
        </View>
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
      {error ? <AppButton label={t('common.retry')} variant="outline" onPress={reload} /> : null}
      {!loading && !error && topics.length === 0 ? <AppText muted>{t('material.empty')}</AppText> : null}

      {topics.map((topic) => (
        <TopicRow key={topic.id} topic={topic} lang={config.lang} access={access} onPress={openTopic} />
      ))}

      <LockedSheet visible={lockedOpen} onClose={() => setLockedOpen(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: theme.spacing.md },
  intro: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md },
  tile: {
    width: 40,
    height: 40,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: { flex: 1, gap: 2 },
});
