import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../../infrastructure/database/prisma.service";
import { EntitlementStatus, OrderStatus, PublicationStatus, Stream } from "@mastara/database";
import { AccessState, SignedEntitlementToken, signEntitlementToken } from "@mastara/domain";

export interface MyCourseResponse {
  course: {
    id: string;
    semesterId: string;
    code: string;
    title: string;
    stream: string;
    contentVersion?: number;
  };
  access: AccessState;
  expiresAt?: string;
  expiresAtMs?: number;
  daysLeft?: number;
  chaptersDone: number;
  chaptersTotal: number;
}

export interface RecentItemResponse {
  id: string;
  kind: "TOPIC" | "NOTE" | "EXAM";
  title: string;
  courseId?: string;
  chapterNumber?: number;
  accessedAt: string;
}

export interface HomeSummaryResponse {
  chaptersDone: number;
  chaptersTotal: number;
  activeProducts: number;
  pendingProducts: number;
  recent: RecentItemResponse[];
  entitlementToken?: SignedEntitlementToken;
  expiresAtMs?: number;
}

@Injectable()
export class LearningService {
  private readonly logger = new Logger(LearningService.name);

  constructor(private readonly prisma: PrismaService) { }

  async getMyCourses(studentId: string): Promise<MyCourseResponse[]> {
    const studentCourses = await this.prisma.studentCourse.findMany({
      where: {
        student_id: studentId,
        is_active: true,
      },
      include: {
        course: {
          select: {
            id: true,
            semester_id: true,
            code: true,
            title_en: true,
            stream: true,
            is_promotional: true,
            trial_expiry_days: true,
          },
        },
      },
      orderBy: { added_at: "asc" },
    });

    let coursesList: any[] = [];
    if (studentCourses.length > 0) {
      coursesList = studentCourses.map((sc) => sc.course);
    } else {
      const student = await this.prisma.student.findUnique({
        where: { id: studentId },
        select: { semester_id: true, stream_pref: true },
      });

      if (student?.semester_id) {
        coursesList = await this.prisma.course.findMany({
          where: {
            semester_id: student.semester_id,
            status: PublicationStatus.PUBLISHED,
            stream: { in: [(student.stream_pref as any) ?? 'NATURAL', Stream.COMMON] },
          },
          select: {
            id: true,
            semester_id: true,
            code: true,
            title_en: true,
            stream: true,
            is_promotional: true,
            trial_expiry_days: true,
            content_version: true,
          },
          orderBy: { sort_order: 'asc' },
        });
      } else {
        const firstSem = await this.prisma.semester.findFirst({
          where: { status: PublicationStatus.PUBLISHED },
          orderBy: { sort_order: 'asc' },
        });
        if (firstSem) {
          coursesList = await this.prisma.course.findMany({
            where: {
              semester_id: firstSem.id,
              status: PublicationStatus.PUBLISHED,
            },
            select: {
              id: true,
              semester_id: true,
              code: true,
              title_en: true,
              stream: true,
              is_promotional: true,
              trial_expiry_days: true,
              content_version: true,
            },
            orderBy: { sort_order: 'asc' },
          });
        }
      }
    }

    if (coursesList.length === 0) {
      return [];
    }

    const courseIds = coursesList.map((c) => c.id);

    // Fetch active entitlements for enrolled courses
    const entitlements = await this.prisma.entitlement.findMany({
      where: {
        student_id: studentId,
        course_id: { in: courseIds },
        status: EntitlementStatus.ACTIVE,
        expires_at: { gt: new Date() },
      },
      select: {
        course_id: true,
        expires_at: true,
      },
    });

    const entitlementMap = new Map(
      entitlements.map((e) => [e.course_id, e.expires_at]),
    );

    // Fetch total topics per course
    const modules = await this.prisma.module.findMany({
      where: {
        course_id: { in: courseIds },
        status: PublicationStatus.PUBLISHED,
      },
      select: {
        course_id: true,
        topics: {
          select: { id: true },
        },
      },
    });

    const courseTopicIdsMap = new Map<string, string[]>();
    for (const m of modules) {
      const existing = courseTopicIdsMap.get(m.course_id) || [];
      const topicIds = m.topics.map((t) => t.id);
      courseTopicIdsMap.set(m.course_id, [...existing, ...topicIds]);
    }

    const allTopicIds = Array.from(courseTopicIdsMap.values()).flat();

    // Fetch completed reading progress records
    const completedProgress = await this.prisma.readingProgress.findMany({
      where: {
        student_id: studentId,
        topic_id: { in: allTopicIds },
        is_completed: true,
      },
      select: { topic_id: true },
    });

    const completedTopicSet = new Set(completedProgress.map((p) => p.topic_id));

    const result: MyCourseResponse[] = [];

    for (const course of coursesList) {
      const expiry = entitlementMap.get(course.id);

      let access: AccessState = "LOCKED";
      let daysLeft: number | undefined = undefined;

      if (expiry) {
        access = "PAID";
        const diffMs = expiry.getTime() - Date.now();
        daysLeft = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
      } else if (course.is_promotional) {
        access = "FREE_TRIAL";
        daysLeft = course.trial_expiry_days ?? undefined;
      }

      const courseTopicIds = courseTopicIdsMap.get(course.id) || [];
      const chaptersTotal = courseTopicIds.length;
      const chaptersDone = courseTopicIds.filter((tid) =>
        completedTopicSet.has(tid),
      ).length;

      result.push({
        course: {
          id: course.id,
          semesterId: course.semester_id,
          code: course.code,
          title: course.title_en,
          stream: course.stream,
          contentVersion: course.content_version,
        },
        access,
        expiresAt: expiry ? expiry.toISOString() : undefined,
        expiresAtMs: expiry ? expiry.getTime() : undefined,
        daysLeft,
        chaptersDone,
        chaptersTotal,
      });
    }

    return result;
  }

  async getHomeSummary(studentId: string): Promise<HomeSummaryResponse> {
    const myCourses = await this.getMyCourses(studentId);

    // 1. Sum chapter stats
    const chaptersDone = myCourses.reduce(
      (sum, item) => sum + item.chaptersDone,
      0,
    );
    const chaptersTotal = myCourses.reduce(
      (sum, item) => sum + item.chaptersTotal,
      0,
    );

    // 3. Count active products and fetch active entitlements for offline signing
    const activeEntitlements = await this.prisma.entitlement.findMany({
      where: {
        student_id: studentId,
        status: EntitlementStatus.ACTIVE,
        expires_at: { gt: new Date() },
      },
      select: {
        course_id: true,
        expires_at: true,
      },
    });

    const activeProducts = activeEntitlements.length;

    // 4. Offline Entitlement Token Signing
    let entitlementToken: SignedEntitlementToken | undefined;
    let expiresAtMs: number | undefined;

    if (activeEntitlements.length > 0) {
      const courseIds = activeEntitlements.map((e) => e.course_id);
      const maxExpiry = new Date(
        Math.max(...activeEntitlements.map((e) => e.expires_at.getTime())),
      );
      expiresAtMs = maxExpiry.getTime();
      try {
        entitlementToken = signEntitlementToken({
          studentId,
          courseIds,
          expiresAt: maxExpiry.toISOString(),
          serverTime: Date.now(),
        });
      } catch (err: any) {
        this.logger.error(`Failed to sign offline entitlement token: ${err.message}`);
      }
    }

    // 5. Count pending products / orders
    const pendingProducts = await this.prisma.order.count({
      where: {
        student_id: studentId,
        status: {
          in: [OrderStatus.PENDING_PAYMENT, OrderStatus.PAYMENT_SUBMITTED],
        },
      },
    });

    // 6. Recent reading activity
    const recentProgress = await this.prisma.readingProgress.findMany({
      where: { student_id: studentId },
      orderBy: { last_read_at: "desc" },
      take: 5,
      include: {
        topic: {
          include: {
            module: {
              select: { course_id: true },
            },
          },
        },
      },
    });

    const recent: RecentItemResponse[] = recentProgress.map((p) => ({
      id: p.id,
      kind: "TOPIC",
      title: p.topic.title_en,
      courseId: p.topic.module.course_id,
      accessedAt: p.last_read_at.toISOString(),
    }));

    if (recent.length === 0 && myCourses.length > 0 && myCourses[0]) {
      recent.push({
        id: `starter-${myCourses[0].course.id}`,
        kind: 'TOPIC',
        title: myCourses[0].course.title,
        courseId: myCourses[0].course.id,
        chapterNumber: 1,
        accessedAt: new Date().toISOString(),
      });
    }

    return {
      chaptersDone,
      chaptersTotal,
      activeProducts,
      pendingProducts,
      recent,
      entitlementToken,
      expiresAtMs,
    };
  }
}
