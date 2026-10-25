// apps/api/src/modules/catalog/services/catalog-snapshot.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { PublicationStatus } from '@mastara/database';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { RedisService } from '../../../infrastructure/redis/redis.service';
import {
  CatalogItemHeader,
  CatalogSnapshotQuery,
  CatalogSnapshotResponse,
} from '@mastara/contracts';

@Injectable()
export class CatalogSnapshotService {
  private readonly logger = new Logger(CatalogSnapshotService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
  ) {}

  private parseSince(since?: string): Date | null {
    if (!since) return null;
    let clean = since.trim();
    if (clean.startsWith('v-')) {
      clean = clean.slice(2);
    }
    const num = Number(clean);
    if (!isNaN(num) && num > 0) {
      return new Date(num);
    }
    const d = new Date(clean);
    return isNaN(d.getTime()) ? null : d;
  }

  async getSnapshot(query: { since?: string; page?: number; limit?: number }): Promise<{
    snapshot: CatalogSnapshotResponse;
    etag: string;
  }> {
    const page = query.page || 1;
    const limit = query.limit || 500;
    const sinceDate = this.parseSince(query.since);

    const version = await this.redisService.getCatalogVersion();
    const cacheKey = `${version}:${query.since || 'all'}:${page}:${limit}`;

    // 1. Try reading from Redis cache
    const cached = await this.redisService.getCachedSnapshot(cacheKey);
    if (cached) {
      try {
        const parsed = JSON.parse(cached) as CatalogSnapshotResponse;
        const etag = `"${version}-${query.since || '0'}-${page}"`;
        return { snapshot: parsed, etag };
      } catch {
        // invalid cache, recompute
      }
    }

    // 2. Fetch metadata from DB
    const whereUpdated = sinceDate ? { updated_at: { gt: sinceDate } } : {};

    const [courses, modules, topics, quizChapters, exams, cocSets, tombstones] =
      await Promise.all([
        this.prisma.course.findMany({
          where: {
            status: PublicationStatus.PUBLISHED,
            ...whereUpdated,
          },
          select: {
            id: true,
            semester_id: true,
            code: true,
            title_en: true,
            title_am: true,
            stream: true,
            icon: true,
            color: true,
            free_trial_items: true,
            is_promotional: true,
            sort_order: true,
            updated_at: true,
          },
        }),
        this.prisma.module.findMany({
          where: {
            status: PublicationStatus.PUBLISHED,
            ...whereUpdated,
          },
          select: {
            id: true,
            course_id: true,
            code: true,
            title_en: true,
            title_am: true,
            is_free_trial: true,
            sort_order: true,
            updated_at: true,
          },
        }),
        this.prisma.topic.findMany({
          where: {
            module: { status: PublicationStatus.PUBLISHED },
            ...whereUpdated,
          },
          select: {
            id: true,
            module_id: true,
            chapter_number: true,
            title_en: true,
            title_am: true,
            is_free_trial: true,
            sort_order: true,
            updated_at: true,
            module: {
              select: { course_id: true, is_free_trial: true },
            },
          },
        }),
        this.prisma.quizChapter.findMany({
          where: whereUpdated,
          select: {
            id: true,
            course_id: true,
            topic_id: true,
            quiz_no: true,
            chapter_number: true,
            is_free_trial: true,
            updated_at: true,
            topic: {
              select: { title_en: true, title_am: true, is_free_trial: true },
            },
          },
        }),
        this.prisma.exam.findMany({
          where: {
            status: PublicationStatus.PUBLISHED,
            ...whereUpdated,
          },
          select: {
            id: true,
            course_id: true,
            university_id: true,
            kind: true,
            title_en: true,
            title_am: true,
            year: true,
            duration_min: true,
            passing_score: true,
            is_free_trial: true,
            updated_at: true,
          },
        }),
        this.prisma.cocSet.findMany({
          where: {
            status: PublicationStatus.PUBLISHED,
            ...whereUpdated,
          },
          select: {
            id: true,
            title_en: true,
            title_am: true,
            year: true,
            duration_min: true,
            is_timed: true,
            sample_question_count: true,
            updated_at: true,
          },
        }),
        sinceDate
          ? this.prisma.catalogTombstone.findMany({
              where: { deleted_at: { gt: sinceDate } },
              select: { entity_id: true },
            })
          : Promise.resolve([]),
      ]);

    // 3. Map entities into CatalogItemHeader metadata
    const items: CatalogItemHeader[] = [];

    // Courses
    for (const c of courses) {
      items.push({
        id: c.id,
        kind: 'COURSE',
        courseId: c.id,
        parentId: c.semester_id,
        title: { en: c.title_en, am: c.title_am },
        order: c.sort_order,
        type: c.stream,
        isFree: c.is_promotional || c.free_trial_items > 0,
        updatedAt: c.updated_at.getTime(),
        meta: {
          code: c.code,
          semesterId: c.semester_id,
          icon: c.icon,
          color: c.color,
          freeTrialItems: c.free_trial_items,
        },
      });
    }

    // Modules
    for (const m of modules) {
      items.push({
        id: m.id,
        kind: 'MODULE',
        courseId: m.course_id,
        parentId: m.course_id,
        title: { en: m.title_en, am: m.title_am },
        order: m.sort_order,
        type: null,
        isFree: m.is_free_trial,
        updatedAt: m.updated_at.getTime(),
        meta: { code: m.code },
      });
    }

    // Topics
    for (const t of topics) {
      items.push({
        id: t.id,
        kind: 'TOPIC',
        courseId: t.module.course_id,
        parentId: t.module_id,
        title: { en: t.title_en, am: t.title_am },
        order: t.chapter_number,
        type: 'MODULE',
        isFree: t.is_free_trial || t.module.is_free_trial,
        updatedAt: t.updated_at.getTime(),
        meta: {
          chapterNumber: t.chapter_number,
          moduleId: t.module_id,
        },
      });
    }

    // Quiz Chapters
    for (const qc of quizChapters) {
      items.push({
        id: qc.id,
        kind: 'QUIZ_CHAPTER',
        courseId: qc.course_id,
        parentId: qc.topic_id,
        title: {
          en: qc.topic?.title_en || `Chapter ${qc.chapter_number}`,
          am: qc.topic?.title_am || `ምዕራፍ ${qc.chapter_number}`,
        },
        order: qc.chapter_number,
        type: `QUIZ_${qc.quiz_no}`,
        isFree: qc.is_free_trial || (qc.topic ? qc.topic.is_free_trial : false),
        updatedAt: qc.updated_at.getTime(),
        meta: {
          quizNo: qc.quiz_no,
          chapterNumber: qc.chapter_number,
          topicId: qc.topic_id,
        },
      });
    }

    // Exams
    for (const e of exams) {
      items.push({
        id: e.id,
        kind: 'EXAM',
        courseId: e.course_id,
        parentId: e.university_id,
        title: { en: e.title_en, am: e.title_am || e.title_en },
        order: e.year ?? 0,
        type: e.kind,
        isFree: e.is_free_trial,
        updatedAt: e.updated_at.getTime(),
        meta: {
          universityId: e.university_id,
          year: e.year,
          durationMin: e.duration_min,
          passingScore: e.passing_score,
        },
      });
    }

    // COC Sets
    for (const cs of cocSets) {
      items.push({
        id: cs.id,
        kind: 'COC_SET',
        courseId: '',
        parentId: null,
        title: { en: cs.title_en, am: cs.title_am || cs.title_en },
        order: cs.year ?? 0,
        type: 'COC',
        isFree: cs.sample_question_count > 0,
        updatedAt: cs.updated_at.getTime(),
        meta: {
          year: cs.year,
          durationMin: cs.duration_min,
          isTimed: cs.is_timed,
          sampleCount: cs.sample_question_count,
        },
      });
    }

    // Sort deterministically by updatedAt ASC, then id ASC
    items.sort((a, b) => {
      const timeDiff = Number(a.updatedAt) - Number(b.updatedAt);
      if (timeDiff !== 0) return timeDiff;
      return a.id.localeCompare(b.id);
    });

    const deletedIds = tombstones.map((t) => t.entity_id);
    const total = items.length;
    const offset = (page - 1) * limit;
    const pagedItems = items.slice(offset, offset + limit);
    const hasMore = offset + limit < total;

    const snapshot: CatalogSnapshotResponse = {
      version,
      items: pagedItems,
      deletedIds,
      page,
      limit,
      total,
      hasMore,
    };

    const etag = `"${version}-${query.since || '0'}-${page}"`;

    // Cache the snapshot in Redis
    await this.redisService.setCachedSnapshot(
      cacheKey,
      JSON.stringify(snapshot),
      3600,
    );

    return { snapshot, etag };
  }
}
