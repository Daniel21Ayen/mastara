// apps/api/src/common/services/scope.service.ts
import { Injectable, ForbiddenException } from "@nestjs/common";
import { PrismaService } from "../../infrastructure/database/prisma.service";

export interface AdminScopeItem {
  id?: string;
  university_id?: string | null;
  program_id?: string | null;
  course_id?: string | null;
  universityId?: string | null;
  programId?: string | null;
  courseId?: string | null;
}

export interface AdminUserContext {
  id: string;
  role: string;
  adminRole?: string;
  scopes?: AdminScopeItem[];
}

@Injectable()
export class ScopeService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Asserts that a target course is within the administrator's assigned academic scope.
   * Super Admins bypass all scope checks.
   */
  async assertCourseInScope(admin: AdminUserContext, courseId: string): Promise<boolean> {
    if (!admin) {
      throw new ForbiddenException("No administrator context provided");
    }

    const adminRole = admin.adminRole || "SUPER_ADMIN";
    if (adminRole === "SUPER_ADMIN") {
      return true;
    }

    const scopes = admin.scopes ?? [];
    if (scopes.length === 0) {
      // Unconstrained academic admin
      return true;
    }

    // Check direct course assignment
    const hasDirectMatch = scopes.some(
      (s) => (s.course_id && s.course_id === courseId) || (s.courseId && s.courseId === courseId),
    );
    if (hasDirectMatch) return true;

    // Load course to inspect program and university hierarchy
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      include: {
        semester: {
          include: {
            program: true,
          },
        },
      },
    });

    if (!course) {
      throw new ForbiddenException("Course not found or inaccessible");
    }

    const programId = course.semester?.program_id;
    const universityId = course.semester?.program?.university_id;

    const matchesScope = scopes.some((s) => {
      const sCourse = s.course_id || s.courseId;
      const sProgram = s.program_id || s.programId;
      const sUni = s.university_id || s.universityId;

      if (sCourse && sCourse === courseId) return true;
      if (sProgram && sProgram === programId) return true;
      if (sUni && sUni === universityId) return true;
      return false;
    });

    if (!matchesScope) {
      throw new ForbiddenException("Access denied: Course is outside your assigned academic scope");
    }

    return true;
  }

  /**
   * Builds a Prisma where filter for querying items scoped to this administrator.
   */
  scopeWhere(admin: AdminUserContext): Record<string, any> {
    if (!admin || (admin.adminRole || "SUPER_ADMIN") === "SUPER_ADMIN") {
      return {};
    }

    const scopes = admin.scopes ?? [];
    if (scopes.length === 0) return {};

    const conditions: Array<Record<string, any>> = [];

    for (const s of scopes) {
      const courseId = s.course_id || s.courseId;
      const programId = s.program_id || s.programId;
      const universityId = s.university_id || s.universityId;

      if (courseId) {
        conditions.push({ id: courseId });
      } else if (programId) {
        conditions.push({ semester: { program_id: programId } });
      } else if (universityId) {
        conditions.push({ semester: { program: { university_id: universityId } } });
      }
    }

    return conditions.length > 0 ? { OR: conditions } : {};
  }
}
