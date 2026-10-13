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

@Injectable()
export class EntitlementsService {
  private readonly logger = new Logger(EntitlementsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Returns all active (non-expired, non-revoked) entitlements for a student,
   * enriched with course info and computed days remaining.
   */
  async getStudentEntitlements(studentId: string): Promise<EntitlementResponse[]> {
    const now = new Date();
    const entitlements = await this.prisma.entitlement.findMany({
      where: {
        student_id: studentId,
        status: EntitlementStatus.ACTIVE,
        expires_at: { gt: now },
      },
      include: {
        course: {
          select: {
            id: true,
            code: true,
            title_en: true,
            title_am: true,
          },
        },
      },
      orderBy: { expires_at: "asc" },
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
