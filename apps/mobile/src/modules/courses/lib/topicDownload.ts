// apps/mobile/src/modules/courses/lib/topicDownload.ts
import type { Topic } from '@mastara/contracts';

import type { DownloadUnit } from '@/core/downloads';

import { contentRemote, topicKey } from '../api/content.api';

/** Download recipe for one lesson (module or note): the full text, English and Amharic together. */
export function topicDownload(topic: Topic): DownloadUnit {
  return {
    unitId: `TOPIC:${topic.id}`,
    kind: 'TOPIC',
    courseId: topic.courseId,
    title: topic.title.en,
    meta: topic,
    fetch: async () => {
      const full = await contentRemote.getTopic(topic.id);
      if (!full) throw new Error('Lesson not found');
      return [{ key: topicKey(topic.id), value: full }];
    },
  };
}
