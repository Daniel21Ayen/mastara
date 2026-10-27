// apps/mobile/src/core/sync/seedCatalog.ts
import raw from '../../../assets/seedCatalog.json';

export interface SeedMetadata {
  source?: string;
  universities?: Array<{ id: string; name: string; code: string }>;
  programs?: Array<{ id: string; universityId: string; name: string }>;
  semesters?: Array<{ id: string; programId: string; number: number }>;
}

export interface SeedItem {
  id: string;
  kind: 'COURSE' | 'MODULE' | 'TOPIC' | 'QUIZ_CHAPTER' | 'EXAM' | 'COC_SET';
  courseId: string;
  parentId?: string | null;
  title: string | { en: string; am: string };
  order?: number;
  type?: string | null;
  isFree?: boolean;
  meta?: Record<string, unknown> | null;
}

export interface SeedCatalog {
  version?: string;
  metadata?: SeedMetadata;
  items: SeedItem[];
}

export const seedCatalog = raw as unknown as SeedCatalog;

export const hasRealSeed = Boolean(
  seedCatalog &&
  (seedCatalog.metadata?.source === 'api-export' || (Array.isArray(seedCatalog.items) && seedCatalog.items.length > 0))
);