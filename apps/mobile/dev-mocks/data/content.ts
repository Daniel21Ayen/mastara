// apps/mobile/src/core/mock/data/content.ts
import type { Course, Topic } from '@mastara/contracts';
import type { ContentKind } from '@mastara/domain';

import { courses } from './courses';

const TOPICS_PER_KIND = 4;

const MODULE_TITLES = {
  en: ['Introduction', 'Core concepts', 'Applications', 'Review'],
  am: ['መግቢያ', 'ዋና ጽንሰ-ሀሳቦች', 'አተገባበር', 'ክለሳ'],
};
const NOTE_TITLES = {
  en: ['Key concepts', 'Definitions', 'Examples', 'Summary'],
  am: ['ዋና ጽንሰ-ሀሳቦች', 'ትርጓሜዎች', 'ምሳሌዎች', 'ማጠቃለያ'],
};

const SUMMARY = {
  MODULE: { en: 'Study material and resources', am: 'የትምህርት ቁሳቁሶች እና ምንጮች' },
  NOTE: { en: 'Key concepts and summaries', am: 'ዋና ጽንሰ-ሀሳቦች እና ማጠቃለያዎች' },
};

const NATURAL_FORMULAS =
  "The rate of change is $f'(x)=\\lim_{h\\to 0}\\frac{f(x+h)-f(x)}{h}$ at every point.\n\n$$x=\\frac{-b\\pm\\sqrt{b^2-4ac}}{2a}$$\n\nEnergy and mass are linked by $E = mc^2$.";

function bodyFor(course: Course, titleEn: string, titleAm: string) {
  const math = course.stream === 'NATURAL' ? `\n\n${NATURAL_FORMULAS}` : '';
  return {
    en: `Sample content for "${titleEn}" in ${course.title}.\n\nThis text is mock data. Real content comes from the admin portal.${math}`,
    am: `ይህ የናሙና ይዘት ነው።\n\n"${titleAm}" · ${course.title}${math}`,
  };
}

export function topicId(courseId: string, kind: ContentKind, number: number): string {
  return `${courseId}~${kind === 'MODULE' ? 'm' : 'n'}${number}`;
}

/** All modules and notes of a course. The first item of each kind is free (default trial rule). */
export function buildTopics(course: Course): Topic[] {
  const kinds: ContentKind[] = ['MODULE', 'NOTE'];

  return kinds.flatMap((kind) => {
    const titles = kind === 'MODULE' ? MODULE_TITLES : NOTE_TITLES;
    return Array.from({ length: TOPICS_PER_KIND }, (_, index): Topic => {
      const number = index + 1;
      const titleEn = titles.en[index] ?? `Part ${number}`;
      const titleAm = titles.am[index] ?? `ክፍል ${number}`;
      return {
        id: topicId(course.id, kind, number),
        courseId: course.id,
        kind,
        number,
        title: { en: titleEn, am: titleAm },
        summary: SUMMARY[kind],
        body: bodyFor(course, titleEn, titleAm),
        isFree: number === 1,
      };
    });
  });
}

export function findTopic(id: string): Topic | null {
  const courseId = id.split('~')[0];
  const course = courses.find((item) => item.id === courseId);
  return course ? (buildTopics(course).find((topic) => topic.id === id) ?? null) : null;
}
