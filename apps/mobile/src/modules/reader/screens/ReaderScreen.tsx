// apps/mobile/src/modules/reader/screens/ReaderScreen.tsx
import { CONTENT_LANGS } from '@mastara/domain';
import type { ContentLang } from '@mastara/domain';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList } from 'react-native';

import { useI18n } from '@/core/i18n';
import { createStyles, useTheme } from '@/core/theme';
import { contentApi } from '@/modules/courses/api/content.api';
import { useScrollList, useVisibleIndex } from '@/shared/hooks';
import { AppText, ErrorNotice, Screen, TopBar } from '@/shared/ui';

import { LessonPage } from '../components/LessonPage';
import type { LessonEntry } from '../hooks/useLessonFeed';
import { useLessonFeed } from '../hooks/useLessonFeed';
import { readerMemoryCache } from '../store/readerMemoryCache';

/** The tab the student came from decides the language. Anything else falls back to English. */
function asLang(value: string | undefined): ContentLang {
  return CONTENT_LANGS.find((lang) => lang === value) ?? 'en';
}

/**
 * Reads lessons by scrolling: the lessons of the tab follow one another on one continuous page, in one language
 * (no language switch). A Next button under each lesson jumps to the next one for students who prefer tapping.
 */
export function ReaderScreen() {
  const theme = useTheme();
  const styles = useStyles();
  const { t } = useI18n();
  const router = useRouter();
  const params = useLocalSearchParams<{ topicId: string; lang?: string }>();
  const lang = asLang(params.lang);
  const { data, loading, error, reload } = useLessonFeed(params.topicId ?? '');

  const { listRef, scrollTo, onScrollToIndexFailed } = useScrollList<LessonEntry>();
  const [current, setCurrent] = useState<number | null>(null);
  // While the page scrolls to the tapped lesson it passes the first ones; those must not start downloading.
  const settled = useRef(false);
  const { onViewableItemsChanged, viewabilityConfig } = useVisibleIndex((index) => {
    if (settled.current) setCurrent(index);
  });

  // Ephemeral memory: clear body cache when reader unmounts (never written to disk silently)
  useEffect(() => {
    return () => {
      readerMemoryCache.clear();
    };
  }, []);

  // Start at the lesson the student tapped; the lessons before it are above, one scroll away.
  useEffect(() => {
    if (!data) return;
    if (data.startIndex === 0) {
      settled.current = true;
      return;
    }
    const jump = setTimeout(() => scrollTo(data.startIndex), 50);
    const settle = setTimeout(() => {
      settled.current = true;
      setCurrent(data.startIndex);
    }, 150);
    return () => {
      clearTimeout(jump);
      clearTimeout(settle);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.first.id]);

  const near = current ?? data?.startIndex ?? 0;

  // Prefetch the next chapter body into memory when the current one finishes rendering
  const handleRendered = useCallback(
    (renderedIndex: number) => {
      if (!data) return;
      const nextLesson = data.lessons[renderedIndex + 1];
      if (nextLesson && nextLesson.canOpen && !readerMemoryCache.has(nextLesson.topic.id)) {
        void contentApi.getTopic(nextLesson.topic.id);
      }
    },
    [data],
  );

  const renderItem = useCallback(
    ({ item, index }: { item: LessonEntry; index: number }) => (
      <LessonPage
        entry={item}
        index={index}
        total={data?.lessons.length ?? 0}
        lang={lang}
        load={Math.abs(index - near) <= 2}
        preloaded={data && item.topic.id === data.first.id ? data.first : null}
        onNext={scrollTo}
        onRendered={handleRendered}
      />
    ),
    [data, handleRendered, lang, near, scrollTo],
  );

  const title = data ? (data.lessons[near]?.topic.title[lang] ?? '') : '';

  return (
    <Screen>
      <TopBar title={title} onBack={() => router.back()} />

      {loading ? <ActivityIndicator color={theme.colors.primary} /> : null}
      {error ? <ErrorNotice error={error} onRetry={reload} /> : null}
      {!loading && !error && !data ? <AppText muted>{t('reader.notFound')}</AppText> : null}

      {data ? (
        <FlatList
          ref={listRef}
          style={styles.flex}
          contentContainerStyle={styles.list}
          data={data.lessons}
          keyExtractor={(item) => item.topic.id}
          renderItem={renderItem}
          extraData={near}
          // Only the lessons near the screen are built and loaded.
          initialNumToRender={2}
          maxToRenderPerBatch={2}
          windowSize={5}
          viewabilityConfig={viewabilityConfig}
          onViewableItemsChanged={onViewableItemsChanged}
          onScrollToIndexFailed={onScrollToIndexFailed}
        />
      ) : null}
    </Screen>
  );
}

const useStyles = createStyles((theme) => ({
  flex: { flex: 1 },
  list: { gap: theme.spacing.md, paddingBottom: theme.spacing.xl },
}));
