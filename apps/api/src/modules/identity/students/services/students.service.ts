import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from "@nestjs/common";
import { PrismaService } from "../../../../infrastructure/database/prisma.service";
import { PreferredLanguage, Stream } from "@mastara/database";
import {
  UpdateAcademicScopeDto,
  UpdateCoursesDto,
  EditAccountDto,
} from "../dto";

export interface StudentProfileResponse {
  id: string;
  name: string;
  identifier: string;
  email: string | null;
  phone: string | null;
  preferredLanguage: PreferredLanguage;
  academic: {
    universityId: string;
    programId: string;
    semesterId: string;
    stream: Stream | null;
  } | null;
  courseIds: string[];
  profileCompleted: boolean;
}

export interface UpdateCoursesResponse {
  success: boolean;
  courseIds: string[];
}

@Injectable()
export class StudentsService {
  private readonly logger = new Logger(StudentsService.name);

  constructor(private readonly prisma: PrismaService) {}

  private normalizeIdentifier(identifier: string): { isEmail: boolean; normalized: string } {
    const trimmed = identifier.trim();
    if (trimmed.includes("@")) {
      return { isEmail: true, normalized: trimmed.toLowerCase() };
    }

    const clean = trimmed.replace(/[\s\-\(\)]/g, "");
    let phone = clean;
    if (clean.startsWith("+251")) {
      phone = clean;
    } else if (clean.startsWith("251")) {
      phone = `+${clean}`;
    } else if (clean.startsWith("09")) {
      phone = `+251${clean.slice(1)}`;
    } else if (clean.startsWith("9")) {
      phone = `+251${clean}`;
    }

    return { isEmail: false, normalized: phone };
  }

  async getProfile(studentId: string): Promise<StudentProfileResponse> {
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
      include: {
        courses: {
          where: { is_active: true },
          select: { course_id: true },
        },
      },
    });

    if (!student) {
      throw new NotFoundException("Student profile not found");
    }

    const name = `${student.first_name} ${student.last_name}`.trim();
    const identifier = student.email || student.phone || "";

    const academic =
      student.university_id && student.program_id && student.semester_id
        ? {
            universityId: student.university_id,
            programId: student.program_id,
            semesterId: student.semester_id,
            stream: student.stream_pref,
          }
        : null;

    return {
      id: student.id,
      name,
      identifier,
      email: student.email,
      phone: student.phone,
      preferredLanguage: student.preferred_language,
      academic,
      courseIds: student.courses.map((c) => c.course_id),
      profileCompleted: Boolean(student.profile_completed_at),
    };
  }

  async updateAcademicScope(
    studentId: string,
    dto: UpdateAcademicScopeDto,
  ): Promise<StudentProfileResponse> {
    // 1. Verify that University exists
    const university = await this.prisma.university.findUnique({
      where: { id: dto.universityId },
    });
    if (!university) {
      throw new NotFoundException(`University not found with ID ${dto.universityId}`);
    }

    // 2. Verify that Program exists
    const program = await this.prisma.program.findUnique({
      where: { id: dto.programId },
    });
    if (!program) {
      throw new NotFoundException(`Program not found with ID ${dto.programId}`);
    }

    // 3. Verify that Semester exists
    const semester = await this.prisma.semester.findUnique({
      where: { id: dto.semesterId },
    });
    if (!semester) {
      throw new NotFoundException(`Semester not found with ID ${dto.semesterId}`);
    }

    // 4. Update student record
    await this.prisma.student.update({
      where: { id: studentId },
      data: {
        university_id: dto.universityId,
        program_id: dto.programId,
        semester_id: dto.semesterId,
        stream_pref: dto.stream,
        profile_completed_at: new Date(),
      },
    });

    return this.getProfile(studentId);
  }

  async updateCourses(
    studentId: string,
    dto: UpdateCoursesDto,
  ): Promise<UpdateCoursesResponse> {
    // 1. Validate that all requested courses exist in database
    const foundCourses = await this.prisma.course.findMany({
      where: { id: { in: dto.courseIds } },
      select: { id: true },
    });

    if (foundCourses.length !== dto.courseIds.length) {
      const foundIds = new Set(foundCourses.map((c) => c.id));
      const missingIds = dto.courseIds.filter((id) => !foundIds.has(id));
      throw new BadRequestException(
        `Invalid course selection. The following course IDs do not exist: ${missingIds.join(", ")}`,
      );
    }

    // 2. Perform synchronization in a database transaction
    await this.prisma.$transaction(async (tx) => {
      // Deactivate courses no longer selected
      await tx.studentCourse.updateMany({
        where: {
          student_id: studentId,
          course_id: { notIn: dto.courseIds },
          is_active: true,
        },
        data: {
          is_active: false,
          removed_at: new Date(),
        },
      });

      // Upsert selected courses
      for (const courseId of dto.courseIds) {
        await tx.studentCourse.upsert({
          where: {
            student_id_course_id: {
              student_id: studentId,
              course_id: courseId,
            },
          },
          update: {
            is_active: true,
            removed_at: null,
          },
          create: {
            student_id: studentId,
            course_id: courseId,
            is_active: true,
          },
        });
      }
    });

    return {
      success: true,
      courseIds: dto.courseIds,
    };
  }

  async updateAccount(
    studentId: string,
    dto: EditAccountDto,
  ): Promise<StudentProfileResponse> {
    const updateData: Record<string, any> = {};

    if (dto.name) {
      const nameParts = dto.name.trim().split(/\s+/);
      updateData.first_name = nameParts[0] || "Student";
      updateData.last_name = nameParts.slice(1).join(" ") || "User";
    }

    if (dto.identifier) {
      const { isEmail, normalized } = this.normalizeIdentifier(dto.identifier);

      const conflict = await this.prisma.student.findFirst({
        where: {
          id: { not: studentId },
          OR: [
            isEmail ? { email: normalized } : { phone: normalized },
            { email: dto.identifier.trim().toLowerCase() },
            { phone: dto.identifier.trim() },
          ],
        },
      });

      if (conflict) {
        throw new ConflictException("This phone or email is already in use by another account");
      }

      if (isEmail) {
        updateData.email = normalized;
      } else {
        updateData.phone = normalized;
      }
    }

    if (Object.keys(updateData).length > 0) {
      await this.prisma.student.update({
        where: { id: studentId },
        data: updateData,
      });
    }

    return this.getProfile(studentId);
  }
}
