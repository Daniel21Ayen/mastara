// apps/mobile/src/modules/reader/components/LessonPage.tsx
import type { Topic } from '@mastara/contracts';
import type { ContentLang } from '@mastara/domain';
import { memo } from 'react';
import { ActivityIndicator } from 'react-native';

import { useI18n } from '@/core/i18n';
import { useTheme } from '@/core/theme';
import { contentApi } from '@/modules/courses/api/content.api';
import { useAsync } from '@/shared/hooks';
import { AppButton, AppText, Card, ErrorNotice, RichText } from '@/shared/ui';

import type { LessonEntry } from '../hooks/useLessonFeed';

interface LessonPageProps {
  entry: LessonEntry;
  /** Zero-based position, given back to `onNext`. */
  index: number;
  total: number;
  lang: ContentLang;
  /** True for the page on screen and the ones next to it. Far pages wait, so scrolling does not download everything. */
  load: boolean;
  /** The lesson the student tapped is already loaded. */
  preloaded: Topic | null;
  onNext: (index: number) => void;
}

/** One lesson in the continuous reader: its text in this tab's language, then a Next button under it. */
export const LessonPage = memo(function LessonPage({ entry, index, total, lang, load, preloaded, onNext }: LessonPageProps) {
  const theme = useTheme();
  const { t } = useI18n();
  const isLast = index === total - 1;

  const body = useAsync(
    !preloaded && load && entry.canOpen ? () => contentApi.getTopic(entry.topic.id) : null,
    [entry.topic.id, load, entry.canOpen, Boolean(preloaded)],
  );
  const topic = preloaded ?? body.data;

  return (
    <Card>
      <AppText variant="caption" muted>
        {t('reader.position', { current: index + 1, total })}
      </AppText>
      <AppText variant="heading" lang={lang} accessibilityRole="header">
        {entry.topic.title[lang]}
      </AppText>

      {!entry.canOpen ? <AppText muted>{t('reader.locked')}</AppText> : null}
      {entry.canOpen && body.loading ? <ActivityIndicator color={theme.colors.primary} /> : null}
      {entry.canOpen && body.error ? <ErrorNotice error={body.error} onRetry={body.reload} /> : null}
      {entry.canOpen && topic ? <RichText text={topic.body[lang]} lang={lang} /> : null}

      {isLast ? null : <AppButton label={t('reader.next')} onPress={() => onNext(index + 1)} />}
    </Card>
  );
});
