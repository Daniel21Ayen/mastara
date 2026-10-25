// apps/mobile/src/modules/courses/components/TopicRow.tsx
import type { Topic } from '@mastara/contracts';
import { canOpenContent } from '@mastara/domain';
import type { AccessState, ContentLang } from '@mastara/domain';
import { Pressable, View } from 'react-native';

import { useI18n } from '@/core/i18n';
import { accentForKey, createStyles, useTheme } from '@/core/theme';
import { DownloadButton } from '@/modules/downloads';
import { AppText, Badge, Icon, IconTile } from '@/shared/ui';

import { topicDownload } from '../lib/topicDownload';

interface TopicRowProps {
  topic: Topic;
  lang: ContentLang;
  access: AccessState;
  onPress: (topic: Topic, open: boolean) => void;
}

export function TopicRow({ topic, lang, access, onPress }: TopicRowProps) {
  const theme = useTheme();
  const styles = useStyles();
  const { t } = useI18n();
  const open = canOpenContent(access, topic.isFree);
  const isModule = topic.kind === 'MODULE';

  // One language per tab. Modules read "Module 1" with the title below; notes read the title with its summary below.
  const title = isModule ? t('topic.module', { n: topic.number }) : topic.title[lang];
  const subtitle = isModule ? topic.title[lang] : topic.summary[lang];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: false }}
      onPress={() => onPress(topic, open)}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <IconTile icon={isModule ? 'module' : 'note'} accent="blue" solid={false} size={48} />
      <View style={styles.text}>
        <AppText bold lang={lang}>
          {title}
        </AppText>
        <AppText variant="caption" muted lang={lang}>
          {subtitle}
        </AppText>
      </View>
      {open ? <DownloadButton unit={topicDownload(topic)} /> : null}
      {open ? (
        topic.isFree ? <Badge label={t('topic.free')} tone="primary" /> : <Icon name="chevron" color={theme.colors.primary} />
      ) : (
        <Icon name="lock" color={theme.colors.textMuted} />
      )}
    </Pressable>
  );
}

const useStyles = createStyles((theme) => ({
  row: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  pressed: { opacity: 0.85 },
  text: { flex: 1, gap: 2 },
}));
