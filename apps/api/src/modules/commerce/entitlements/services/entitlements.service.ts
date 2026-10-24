import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../../../infrastructure/database/prisma.service";
import { EntitlementStatus } from "@mastara/database";

export interface EntitlementResponse {
  id: string;
  courseId: string;
  courseCode: string;
  courseTitle: { en: string; am: string };
  orderId: string | null;
  startsAt: Date;
  expiresAt: Date;
  status: EntitlementStatus;
  daysLeft: number;
}

import { PaginationQueryDto, PaginatedResult } from "../../../../common/pagination";

@Injectable()
export class EntitlementsService {
  private readonly logger = new Logger(EntitlementsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Returns active (non-expired, non-revoked) entitlements for a student with optional pagination.
   */
  async getStudentEntitlements(
    studentId: string,
    query?: PaginationQueryDto,
  ): Promise<EntitlementResponse[] | PaginatedResult<EntitlementResponse>> {
    const now = new Date();
    const where = {
      student_id: studentId,
      status: EntitlementStatus.ACTIVE,
      expires_at: { gt: now },
    };
    const orderBy: any = [{ expires_at: "asc" }, { id: "asc" }];
    const include = {
      course: {
        select: {
          id: true,
          code: true,
          title_en: true,
          title_am: true,
        },
      },
    };

    if (query?.page || query?.pageSize) {
      const page = Math.max(1, query.page ?? 1);
      const pageSize = Math.min(100, Math.max(1, query.pageSize ?? 10));
      const skip = (page - 1) * pageSize;
      const [total, entitlements] = await Promise.all([
        this.prisma.entitlement.count({ where }),
        this.prisma.entitlement.findMany({
          where,
          include,
          skip,
          take: pageSize,
          orderBy,
        }),
      ]);
      const items = entitlements.map((e) => ({
        id: e.id,
        courseId: e.course_id,
        courseCode: e.course.code,
        courseTitle: {
          en: e.course.title_en,
          am: e.course.title_am,
        },
        orderId: e.order_id,
        startsAt: e.starts_at,
        expiresAt: e.expires_at,
        status: e.status,
        daysLeft: Math.max(
          0,
          Math.ceil((e.expires_at.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
        ),
      }));
      const totalPages = Math.max(1, Math.ceil(total / pageSize));
      return {
        items,
        page,
        pageSize,
        total,
        totalPages,
        pageCount: totalPages,
      };
    }

    const entitlements = await this.prisma.entitlement.findMany({
      where,
      include,
      orderBy,
    });

    return entitlements.map((e) => ({
      id: e.id,
      courseId: e.course_id,
      courseCode: e.course.code,
      courseTitle: {
        en: e.course.title_en,
        am: e.course.title_am,
      },
      orderId: e.order_id,
      startsAt: e.starts_at,
      expiresAt: e.expires_at,
      status: e.status,
      daysLeft: Math.max(
        0,
        Math.ceil((e.expires_at.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
      ),
    }));
  }
}
