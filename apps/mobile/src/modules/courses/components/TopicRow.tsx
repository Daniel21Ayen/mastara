// apps/mobile/src/modules/courses/components/TopicRow.tsx
import type { Topic } from '@mastara/contracts';
import { canOpenContent } from '@mastara/domain';
import type { AccessState, ContentLang } from '@mastara/domain';
import { Pressable, StyleSheet, View } from 'react-native';

import { useI18n } from '@/core/i18n';
import { theme } from '@/core/theme';
import { AppText, Badge, Icon } from '@/shared/ui';

interface TopicRowProps {
  topic: Topic;
  lang: ContentLang;
  access: AccessState;
  onPress: (topic: Topic, open: boolean) => void;
}

export function TopicRow({ topic, lang, access, onPress }: TopicRowProps) {
  const { t } = useI18n();
  const open = canOpenContent(access, topic.isFree);
  const isModule = topic.kind === 'MODULE';

  // Modules read "Module 1" with the topic title below; notes read the title with its summary below.
  const title = isModule ? t('topic.module', { n: topic.number }) : topic.title[lang];
  const subtitle = isModule ? topic.title[lang] : topic.summary[lang];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: false }}
      onPress={() => onPress(topic, open)}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <View style={styles.tile}>
        <Icon name={isModule ? 'module' : 'note'} color={theme.colors.primary} />
      </View>
      <View style={styles.text}>
        <AppText bold lang={lang}>
          {title}
        </AppText>
        <AppText variant="caption" muted lang={lang}>
          {subtitle}
        </AppText>
      </View>
      {open ? (
        topic.isFree ? <Badge label={t('topic.free')} /> : <Icon name="chevron" color={theme.colors.textMuted} />
      ) : (
        <Icon name="lock" color={theme.colors.danger} />
      )}
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
  tile: {
    width: 48,
    height: 48,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: { flex: 1, gap: 2 },
});
