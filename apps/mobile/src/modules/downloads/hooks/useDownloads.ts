// apps/mobile/src/modules/downloads/hooks/useDownloads.ts
import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';

import { downloadStatus, downloadStore } from '@/core/downloads';
import type { DownloadedUnit, TransferStatus } from '@/core/downloads';

/** IDs of everything downloaded, kept fresh when something is downloaded or deleted. */
export function useDownloadedIds(): ReadonlySet<string> {
  const [ids, setIds] = useState<ReadonlySet<string>>(new Set());

  useEffect(() => {
    let active = true;
    const load = () => void downloadStore.ids().then((next) => active && setIds(next));
    load();
    const unsubscribe = downloadStore.subscribe(load);
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  return ids;
}

/** Everything downloaded, newest first, with the total size. */
export function useDownloadList(): { units: DownloadedUnit[]; totalBytes: number; loaded: boolean } {
  const [state, setState] = useState<{ units: DownloadedUnit[]; totalBytes: number; loaded: boolean }>({
    units: [],
    totalBytes: 0,
    loaded: false,
  });

  useEffect(() => {
    let active = true;
    const load = () =>
      void Promise.all([downloadStore.list(), downloadStore.totalBytes()]).then(
        ([units, totalBytes]) => active && setState({ units, totalBytes, loaded: true }),
      );
    load();
    const unsubscribe = downloadStore.subscribe(load);
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  return state;
}

/** Whether one item is downloading or failed (downloaded is known from `useDownloadedIds`). */
export function useTransferStatus(unitId: string): TransferStatus | undefined {
  const subscribe = useCallback((listener: () => void) => downloadStatus.subscribe(listener), []);
  return useSyncExternalStore(subscribe, () => downloadStatus.get(unitId));
}

/** Whether a course is currently downloaded locally on this device. */
export function useIsCourseDownloaded(courseId: string): boolean {
  const ids = useDownloadedIds();
  return ids.has(`COURSE:${courseId}`);
}
