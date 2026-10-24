import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from "@nestjs/common";
import { PrismaService } from "../../../../infrastructure/database/prisma.service";
import {
  DeviceBindingStatus,
  EntitlementStatus,
  OrderStatus,
  PreferredLanguage,
  PublicationStatus,
  Role,
  Stream,
  StudentStatus,
} from "@mastara/database";
import {
  AdminStudentCourseDto,
  AdminStudentDetailDto,
  AdminStudentSummaryDto,
  CreateStudentDto,
  StudentListQueryDto,
  StudentListResultDto,
  StudentOptionsDto,
  UpdateAcademicScopeDto,
  UpdateCoursesDto,
  EditAccountDto,
} from "../dto";
import { AuditService } from "../../../platform/audit/services/audit.service";

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

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  public normalizeIdentifier(identifier: string): { isEmail: boolean; normalized: string } {
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

  // --------------------------------------------------------------------------
  // Student Portal Profile Methods
  // --------------------------------------------------------------------------

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
    const university = await this.prisma.university.findUnique({
      where: { id: dto.universityId },
    });
    if (!university) {
      throw new NotFoundException(`University not found with ID ${dto.universityId}`);
    }

    const program = await this.prisma.program.findUnique({
      where: { id: dto.programId },
    });
    if (!program) {
      throw new NotFoundException(`Program not found with ID ${dto.programId}`);
    }

    const semester = await this.prisma.semester.findUnique({
      where: { id: dto.semesterId },
    });
    if (!semester) {
      throw new NotFoundException(`Semester not found with ID ${dto.semesterId}`);
    }

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

    await this.prisma.$transaction(async (tx) => {
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

  // --------------------------------------------------------------------------
  // Admin Methods (Directory, Search, Actions, Access)
  // --------------------------------------------------------------------------

  async listAdminStudents(query: StudentListQueryDto): Promise<StudentListResultDto> {
    const page = Math.max(1, query.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, query.pageSize ?? 10));
    const skip = (page - 1) * pageSize;
    const now = new Date();

    const where: any = {
      role: Role.STUDENT,
    };

    if (query.universityId) {
      where.university_id = query.universityId;
    }

    if (query.stream) {
      where.stream_pref = query.stream as Stream;
    }

    if (query.q && query.q.trim()) {
      const text = query.q.trim();
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(text);
      where.OR = [
        { student_code: { contains: text, mode: "insensitive" } },
        ...(isUuid ? [{ id: text }] : []),
        { first_name: { contains: text, mode: "insensitive" } },
        { last_name: { contains: text, mode: "insensitive" } },
        { phone: { contains: text, mode: "insensitive" } },
        { email: { contains: text, mode: "insensitive" } },
      ];
    }

    if (query.access === "PAID") {
      where.entitlements = {
        some: { status: EntitlementStatus.ACTIVE, expires_at: { gt: now } },
      };
    } else if (query.access === "PENDING") {
      where.orders = {
        some: { status: OrderStatus.PAYMENT_SUBMITTED },
      };
      where.entitlements = {
        none: { status: EntitlementStatus.ACTIVE, expires_at: { gt: now } },
      };
    } else if (query.access === "EXPIRED") {
      where.entitlements = {
        some: { status: EntitlementStatus.ACTIVE, expires_at: { lte: now } },
        none: { status: EntitlementStatus.ACTIVE, expires_at: { gt: now } },
      };
    } else if (query.access === "FREE_TRIAL") {
      where.entitlements = { none: {} };
      where.orders = { none: { status: OrderStatus.PAYMENT_SUBMITTED } };
    }

    const [total, students] = await Promise.all([
      this.prisma.student.count({ where }),
      this.prisma.student.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: [{ student_number: "asc" }, { created_at: "desc" }, { id: "asc" }],
        include: {
          university: true,
          program: true,
          semester: true,
          device_binding: true,
          courses: true,
          entitlements: {
            where: { status: EntitlementStatus.ACTIVE },
          },
          orders: {
            where: { status: OrderStatus.PAYMENT_SUBMITTED },
            include: { items: true },
          },
        },
      }),
    ]);

    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const items = students.map((s) => this._mapToAdminSummary(s, now.getTime()));

    return {
      items,
      total,
      page,
      pageSize,
      totalPages,
      pageCount: totalPages,
    };
  }

  async getAdminStudentById(id: string): Promise<AdminStudentDetailDto> {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    const student = await this.prisma.student.findFirst({
      where: isUuid ? { id } : { student_code: id },
      include: {
        university: true,
        program: true,
        semester: true,
        device_binding: true,
        courses: {
          include: { course: true },
        },
        entitlements: {
          where: { status: EntitlementStatus.ACTIVE },
          include: { course: true },
        },
        orders: {
          where: { status: OrderStatus.PAYMENT_SUBMITTED },
          include: { items: { include: { course: true } } },
        },
      },
    });

    if (!student) {
      throw new NotFoundException(`Student not found with ID ${id}`);
    }

    return this._mapToAdminDetail(student);
  }

  async getStudentOptions(): Promise<StudentOptionsDto> {
    const [universities, programs, semesters] = await Promise.all([
      this.prisma.university.findMany({
        where: { status: PublicationStatus.PUBLISHED },
        orderBy: { sort_order: "asc" },
      }),
      this.prisma.program.findMany({
        where: { status: PublicationStatus.PUBLISHED },
        orderBy: { sort_order: "asc" },
      }),
      this.prisma.semester.findMany({
        where: { status: PublicationStatus.PUBLISHED },
        orderBy: { sort_order: "asc" },
      }),
    ]);

    return {
      universities: universities.map((u) => ({
        id: u.id,
        name: u.name_en,
        shortName: u.code,
      })),
      programs: programs.map((p) => ({
        id: p.id,
        universityId: p.university_id,
        name: p.name_en,
      })),
      semesters: semesters.map((s) => ({
        id: s.id,
        programId: s.program_id,
        number: s.sort_order === 2 || s.code.includes("2") ? 2 : 1,
      })),
    };
  }

  async createAdminStudent(
    adminId: string,
    input: CreateStudentDto,
  ): Promise<AdminStudentDetailDto> {
    const { isEmail, normalized } = this.normalizeIdentifier(input.identifier);

    const existing = await this.prisma.student.findFirst({
      where: {
        OR: [
          isEmail ? { email: normalized } : { phone: normalized },
          { email: input.identifier.trim().toLowerCase() },
          { phone: input.identifier.trim() },
        ],
      },
    });

    if (existing) {
      throw new ConflictException({
        errorCode: "IDENTIFIER_DUPLICATE",
        message: "A student with this phone or email already exists",
      });
    }

    const [university, program, semester] = await Promise.all([
      this.prisma.university.findUnique({ where: { id: input.universityId } }),
      this.prisma.program.findUnique({ where: { id: input.programId } }),
      this.prisma.semester.findUnique({ where: { id: input.semesterId } }),
    ]);

    if (
      !university ||
      !program ||
      !semester ||
      semester.program_id !== program.id ||
      program.university_id !== university.id
    ) {
      throw new BadRequestException("Invalid academic hierarchy selection");
    }

    const nameParts = input.name.trim().split(/\s+/);
    const firstName = nameParts[0] || "Student";
    const lastName = nameParts.slice(1).join(" ") || "User";

    const student = await this.prisma.student.create({
      data: {
        first_name: firstName,
        last_name: lastName,
        phone: !isEmail ? normalized : null,
        email: isEmail ? normalized : null,
        password_hash: "$2b$10$placeholder.for.admin.created.student",
        role: Role.STUDENT,
        status: StudentStatus.ACTIVE,
        university_id: input.universityId,
        program_id: input.programId,
        semester_id: input.semesterId,
        stream_pref: input.stream as Stream,
        profile_completed_at: new Date(),
      },
    });

    const courses = await this.prisma.course.findMany({
      where: {
        semester_id: input.semesterId,
        OR: [{ stream: input.stream as Stream }, { stream: Stream.COMMON }],
      },
    });

    if (courses.length > 0) {
      await this.prisma.studentCourse.createMany({
        data: courses.map((c) => ({
          student_id: student.id,
          course_id: c.id,
          is_active: true,
        })),
        skipDuplicates: true,
      });
    }

    await this.auditService.log({
      actorId: adminId,
      actorRole: Role.ADMIN,
      action: "STUDENT_ADDED",
      targetType: "Student",
      targetId: student.id,
      metadata: { target: `Student ${student.id}`, name: input.name },
    });

    return this.getAdminStudentById(student.id);
  }

  async suspendStudent(
    adminId: string,
    id: string,
    reason: string,
  ): Promise<AdminStudentDetailDto> {
    const student = await this.prisma.student.findUnique({ where: { id } });
    if (!student) {
      throw new NotFoundException(`Student not found with ID ${id}`);
    }

    if (student.status === StudentStatus.SUSPENDED) {
      throw new ConflictException({
        errorCode: "INVALID_STATE",
        message: "Student is already suspended",
      });
    }

    await this.prisma.student.update({
      where: { id },
      data: { status: StudentStatus.SUSPENDED },
    });

    await this.auditService.log({
      actorId: adminId,
      actorRole: Role.ADMIN,
      action: "STUDENT_SUSPENDED",
      targetType: "Student",
      targetId: id,
      metadata: { target: `Student ${id}`, reason },
    });

    return this.getAdminStudentById(id);
  }

  async reactivateStudent(
    adminId: string,
    id: string,
    reason: string,
  ): Promise<AdminStudentDetailDto> {
    const student = await this.prisma.student.findUnique({ where: { id } });
    if (!student) {
      throw new NotFoundException(`Student not found with ID ${id}`);
    }

    if (student.status === StudentStatus.ACTIVE) {
      throw new ConflictException({
        errorCode: "INVALID_STATE",
        message: "Student is already active",
      });
    }

    await this.prisma.student.update({
      where: { id },
      data: { status: StudentStatus.ACTIVE },
    });

    await this.auditService.log({
      actorId: adminId,
      actorRole: Role.ADMIN,
      action: "STUDENT_REACTIVATED",
      targetType: "Student",
      targetId: id,
      metadata: { target: `Student ${id}`, reason },
    });

    return this.getAdminStudentById(id);
  }

  async revokeStudentDevice(
    adminId: string,
    id: string,
    reason: string,
  ): Promise<AdminStudentDetailDto> {
    const student = await this.prisma.student.findUnique({
      where: { id },
      include: { device_binding: true },
    });

    if (!student) {
      throw new NotFoundException(`Student not found with ID ${id}`);
    }

    if (!student.device_binding || student.device_binding.status !== DeviceBindingStatus.ACTIVE) {
      throw new ConflictException({
        errorCode: "INVALID_STATE",
        message: "Student does not have an active bound device",
      });
    }

    await this.prisma.deviceBinding.update({
      where: { student_id: id },
      data: {
        status: DeviceBindingStatus.REVOKED,
        revoked_at: new Date(),
        revoked_by: adminId,
        revoke_reason: reason,
      },
    });

    await this.auditService.log({
      actorId: adminId,
      actorRole: Role.ADMIN,
      action: "DEVICE_REVOKED",
      targetType: "Student",
      targetId: id,
      metadata: { target: `Student ${id}`, reason },
    });

    return this.getAdminStudentById(id);
  }

  async grantStudentAccess(
    adminId: string,
    id: string,
    courseId: string,
    days: number,
    reason: string,
  ): Promise<AdminStudentDetailDto> {
    const student = await this.prisma.student.findUnique({
      where: { id },
      include: {
        entitlements: {
          where: { course_id: courseId, status: EntitlementStatus.ACTIVE },
        },
      },
    });

    if (!student) {
      throw new NotFoundException(`Student not found with ID ${id}`);
    }

    const course = await this.prisma.course.findUnique({ where: { id: courseId } });
    if (!course) {
      throw new NotFoundException(`Course not found with ID ${courseId}`);
    }

    const now = new Date();
    const existingEntitlement = student.entitlements[0];
    const isExtension =
      existingEntitlement && new Date(existingEntitlement.expires_at).getTime() > now.getTime();

    let targetExpiresAt: Date;
    if (isExtension) {
      targetExpiresAt = new Date(
        new Date(existingEntitlement.expires_at).getTime() + days * 86400000,
      );
      await this.prisma.entitlement.update({
        where: { id: existingEntitlement.id },
        data: { expires_at: targetExpiresAt },
      });
    } else {
      targetExpiresAt = new Date(now.getTime() + days * 86400000);
      await this.prisma.entitlement.create({
        data: {
          student_id: id,
          course_id: courseId,
          starts_at: now,
          expires_at: targetExpiresAt,
          status: EntitlementStatus.ACTIVE,
        },
      });
    }

    await this.prisma.studentCourse.upsert({
      where: { student_id_course_id: { student_id: id, course_id: courseId } },
      update: { is_active: true, removed_at: null },
      create: { student_id: id, course_id: courseId, is_active: true },
    });

    const courseTitle = course.title_en || course.title_am || courseId;
    const auditAction = isExtension ? "ACCESS_EXTENDED" : "ACCESS_GRANTED";

    await this.auditService.log({
      actorId: adminId,
      actorRole: Role.ADMIN,
      action: auditAction,
      targetType: "Student",
      targetId: id,
      metadata: {
        target: `Student ${id} · ${courseTitle}`,
        courseId,
        days,
        reason,
      },
    });

    return this.getAdminStudentById(id);
  }

  // --------------------------------------------------------------------------
  // Private Helpers
  // --------------------------------------------------------------------------

  private _mapToAdminSummary(student: any, nowMs: number = Date.now()): AdminStudentSummaryDto {
    const hasActivePaid = (student.entitlements ?? []).some(
      (e: any) => new Date(e.expires_at).getTime() > nowMs,
    );
    const hasPending = (student.orders ?? []).some(
      (o: any) => o.status === OrderStatus.PAYMENT_SUBMITTED,
    );
    const hasExpired = (student.entitlements ?? []).some(
      (e: any) => new Date(e.expires_at).getTime() <= nowMs,
    );

    let access: "PAID" | "PENDING" | "FREE_TRIAL" | "EXPIRED" = "FREE_TRIAL";
    if (hasActivePaid) access = "PAID";
    else if (hasPending) access = "PENDING";
    else if (hasExpired) access = "EXPIRED";
    else access = "FREE_TRIAL";

    const name = `${student.first_name ?? ""} ${student.last_name ?? ""}`.trim() || "Student";
    const identifier = student.phone || student.email || "";
    const isBound = student.device_binding?.status === DeviceBindingStatus.ACTIVE;
    const studentCode =
      student.student_code ||
      (student.student_number ? `MS${String(student.student_number).padStart(4, "0")}` : undefined);

    return {
      id: student.id,
      studentCode,
      name,
      identifier,
      universityId: student.university_id || "",
      universityShortName: student.university?.code || "",
      stream: student.stream_pref === Stream.SOCIAL ? "SOCIAL" : "NATURAL",
      courseCount: (student.courses ?? []).length,
      status: student.status === StudentStatus.SUSPENDED ? "SUSPENDED" : "ACTIVE",
      device: isBound ? "BOUND" : "RELEASED",
      access,
    };
  }

  private async _mapToAdminDetail(
    student: any,
    nowMs: number = Date.now(),
  ): Promise<AdminStudentDetailDto> {
    const summary = this._mapToAdminSummary(student, nowMs);

    let enrolledCourses: any[] = (student.courses ?? [])
      .map((sc: any) => sc.course)
      .filter(Boolean);

    if (enrolledCourses.length === 0 && student.semester_id) {
      enrolledCourses = await this.prisma.course.findMany({
        where: {
          semester_id: student.semester_id,
          OR: [
            { stream: student.stream_pref || Stream.NATURAL },
            { stream: Stream.COMMON },
          ],
        },
      });
    }

    const entitlementCourses = (student.entitlements ?? [])
      .map((e: any) => e.course)
      .filter(Boolean);
    for (const ec of entitlementCourses) {
      if (!enrolledCourses.some((c) => c.id === ec.id)) {
        enrolledCourses.push(ec);
      }
    }

    const pendingCourseIds = new Set<string>();
    for (const order of student.orders ?? []) {
      for (const item of order.items ?? []) {
        if (item.course_id) pendingCourseIds.add(item.course_id);
      }
    }

    const mappedCourses: AdminStudentCourseDto[] = enrolledCourses.map((c) => {
      const ent = (student.entitlements ?? []).find((e: any) => e.course_id === c.id);
      let access: "PAID" | "PENDING" | "FREE_TRIAL" | "EXPIRED" = "FREE_TRIAL";
      let expiresAt: string | undefined = undefined;

      if (ent) {
        expiresAt =
          ent.expires_at instanceof Date
            ? ent.expires_at.toISOString()
            : new Date(ent.expires_at).toISOString();
        if (new Date(ent.expires_at).getTime() > nowMs) {
          access = "PAID";
        } else {
          access = "EXPIRED";
        }
      } else if (pendingCourseIds.has(c.id)) {
        access = "PENDING";
      } else {
        access = "FREE_TRIAL";
      }

      let courseStream: "NATURAL" | "SOCIAL" | "COMMON" = "COMMON";
      if (c.stream === Stream.NATURAL) courseStream = "NATURAL";
      else if (c.stream === Stream.SOCIAL) courseStream = "SOCIAL";
      else courseStream = "COMMON";

      return {
        courseId: c.id,
        code: c.code || "COURSE",
        title: c.title_en || c.title_am || "Course",
        stream: courseStream,
        access,
        expiresAt,
      };
    });

    const isBound = student.device_binding?.status === DeviceBindingStatus.ACTIVE;
    const semesterNumber: 1 | 2 =
      student.semester?.sort_order === 2 || student.semester?.code?.includes("2") ? 2 : 1;

    return {
      ...summary,
      courseCount: mappedCourses.length,
      programName:
        student.program?.name_en ||
        student.program?.name_am ||
        student.program_id ||
        "",
      semesterNumber,
      boundAt:
        isBound && student.device_binding?.bound_at
          ? student.device_binding.bound_at instanceof Date
            ? student.device_binding.bound_at.toISOString()
            : new Date(student.device_binding.bound_at).toISOString()
          : undefined,
      lastSeenAt: student.device_binding?.last_seen_at
        ? student.device_binding.last_seen_at instanceof Date
          ? student.device_binding.last_seen_at.toISOString()
          : new Date(student.device_binding.last_seen_at).toISOString()
        : undefined,
      courses: mappedCourses,
    };
  }
}
