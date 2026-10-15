// apps/mobile/src/shared/hooks/useScrollList.ts
import { useCallback, useRef } from 'react';
import type { FlatList, ViewToken } from 'react-native';

/**
 * Helpers for a page-after-page scrolling list (lessons, quiz questions, exam questions).
 * Scrolling is the main way to move; `scrollTo` powers the Next button under each page.
 */
export function useScrollList<T>() {
  const listRef = useRef<FlatList<T>>(null);

  const scrollTo = useCallback((index: number) => {
    listRef.current?.scrollToIndex({ index, animated: true, viewPosition: 0 });
  }, []);

  /** The page is not measured yet (it is far away): go near it first, then to it. */
  const onScrollToIndexFailed = useCallback((info: { index: number; averageItemLength: number }) => {
    listRef.current?.scrollToOffset({ offset: info.averageItemLength * info.index, animated: true });
    setTimeout(() => listRef.current?.scrollToIndex({ index: info.index, animated: true }), 300);
  }, []);

  return { listRef, scrollTo, onScrollToIndexFailed };
}

/**
 * Tells you which page is at the top of the screen. A page counts when it covers a good part of the SCREEN, so a very tall
 * lesson (several screens long) is still found. Handlers keep one identity, as FlatList requires.
 */
export function useVisibleIndex(onChange: (index: number) => void) {
  const latest = useRef(onChange);
  latest.current = onChange;

  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    const first = viewableItems.find((item) => item.index !== null && item.index !== undefined);
    if (first && first.index !== null && first.index !== undefined) latest.current(first.index);
  }).current;

  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 40 }).current;

  return { onViewableItemsChanged, viewabilityConfig };
}
