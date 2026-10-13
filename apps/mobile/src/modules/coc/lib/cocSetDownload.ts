// apps/mobile/src/modules/coc/lib/cocSetDownload.ts
import type { CocSet } from '@mastara/contracts';

import type { DownloadUnit } from '@/core/downloads';

import { cocKey, cocRemote } from '../api/coc.api';

/** Download recipe for one COC set. A downloaded set is a fixed snapshot of its questions. */
export function cocSetDownload(set: CocSet, courseIds: readonly string[]): DownloadUnit {
  return {
    unitId: `COC_SET:${set.id}`,
    kind: 'COC_SET',
    courseId: null,
    title: set.title.en,
    meta: set,
    fetch: async () => {
      const session = await cocRemote.getSession(set.id, courseIds);
      if (!session) throw new Error('COC set not found');
      return [{ key: cocKey(set.id), value: session }];
    },
  };
}
