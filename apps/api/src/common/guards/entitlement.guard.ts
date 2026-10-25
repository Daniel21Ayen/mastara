import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from "@nestjs/common";
import { PrismaService } from "../../infrastructure/database/prisma.service";
import { EntitlementStatus } from "@mastara/database";

@Injectable()
export class EntitlementGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const studentId = request.user?.id;
    const courseId = request.params?.courseId;

    if (!studentId || request.user?.role !== "STUDENT" || !courseId) {
      return true;
    }

    const entitlement = await this.prisma.entitlement.findFirst({
      where: {
        student_id: studentId,
        course_id: courseId,
        status: EntitlementStatus.ACTIVE,
        expires_at: { gt: new Date() },
      },
    });

    if (!entitlement) {
      throw new ForbiddenException({
        statusCode: 403,
        errorCode: "CONTENT_LOCKED",
        message: "Active entitlement required to access this course content",
      });
    }

    return true;
  }
}
