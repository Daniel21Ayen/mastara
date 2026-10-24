import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../../../infrastructure/database/prisma.service";
import { PublicationStatus, Role, Stream } from "@mastara/database";
import {
  AdminCourseDto,
  AdminProgramDto,
  AdminSemesterDto,
  AdminUniversityDto,
  CourseListQueryDto,
  CourseListResultDto,
  CreateCourseDto,
  ProgramInputDto,
  SemesterStatusDto,
  UniversityInputDto,
  UpdateCourseDto,
} from "../dto";
import { GetCoursesQueryDto } from "../dto/get-courses-query.dto";
import { AuditService } from "../../platform/audit/services/audit.service";
import { PaginationQueryDto, PaginatedResult } from "../../../common/pagination";

export interface UniversityResponse {
  id: string;
  code: string;
  name: string;
  shortName: string;
  nameEn: string;
  nameAm: string;
  logoUrl: string | null;
  sortOrder: number;
}

export interface ProgramResponse {
  id: string;
  universityId: string;
  code: string;
  name: string;
  nameEn: string;
  nameAm: string;
  sortOrder: number;
}

export interface SemesterResponse {
  id: string;
  programId: string;
  code: string;
  number: number;
  nameEn: string;
  nameAm: string;
  sortOrder: number;
}

export interface CourseResponse {
  id: string;
  semesterId: string;
  code: string;
  title: string;
  titleEn: string;
  titleAm: string;
  descriptionEn: string | null;
  descriptionAm: string | null;
  stream: Stream;
  isPromotional: boolean;
  trialExpiryDays: number | null;
  sortOrder: number;
}

@Injectable()
export class CatalogService {
  private readonly logger = new Logger(CatalogService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  // --------------------------------------------------------------------------
  // Student Portal Read APIs
  // --------------------------------------------------------------------------

  async getUniversities(): Promise<UniversityResponse[]> {
    const list = await this.prisma.university.findMany({
      where: { status: PublicationStatus.PUBLISHED },
      orderBy: { sort_order: "asc" },
      select: {
        id: true,
        code: true,
        name_en: true,
        name_am: true,
        logo_url: true,
        sort_order: true,
      },
    });

    return list.map((u) => ({
      id: u.id,
      code: u.code,
      name: u.name_en,
      shortName: u.code,
      nameEn: u.name_en,
      nameAm: u.name_am,
      logoUrl: u.logo_url,
      sortOrder: u.sort_order,
    }));
  }

  async getPrograms(universityId: string): Promise<ProgramResponse[]> {
    const university = await this.prisma.university.findUnique({
      where: { id: universityId },
      select: { id: true },
    });

    if (!university) {
      throw new NotFoundException(`University not found with ID ${universityId}`);
    }

    const list = await this.prisma.program.findMany({
      where: {
        university_id: universityId,
        status: PublicationStatus.PUBLISHED,
      },
      orderBy: { sort_order: "asc" },
      select: {
        id: true,
        university_id: true,
        code: true,
        name_en: true,
        name_am: true,
        sort_order: true,
      },
    });

    return list.map((p) => ({
      id: p.id,
      universityId: p.university_id,
      code: p.code,
      name: p.name_en,
      nameEn: p.name_en,
      nameAm: p.name_am,
      sortOrder: p.sort_order,
    }));
  }

  async getSemesters(programId: string): Promise<SemesterResponse[]> {
    const program = await this.prisma.program.findUnique({
      where: { id: programId },
      select: { id: true },
    });

    if (!program) {
      throw new NotFoundException(`Program not found with ID ${programId}`);
    }

    const list = await this.prisma.semester.findMany({
      where: {
        program_id: programId,
        status: PublicationStatus.PUBLISHED,
      },
      orderBy: { sort_order: "asc" },
      select: {
        id: true,
        program_id: true,
        code: true,
        name_en: true,
        name_am: true,
        sort_order: true,
      },
    });

    return list.map((s) => {
      const match = s.code.match(/SEM(\d+)/i) || s.code.match(/(\d+)/);
      const parsedNum = match && match[1] ? parseInt(match[1], 10) : s.sort_order;
      return {
        id: s.id,
        programId: s.program_id,
        code: s.code,
        number: parsedNum === 2 ? 2 : 1,
        nameEn: s.name_en,
        nameAm: s.name_am,
        sortOrder: s.sort_order,
      };
    });
  }

  async getCourses(query: GetCoursesQueryDto): Promise<CourseResponse[]> {
    const semester = await this.prisma.semester.findUnique({
      where: { id: query.semesterId },
      select: { id: true },
    });

    if (!semester) {
      throw new NotFoundException(`Semester not found with ID ${query.semesterId}`);
    }

    const streamFilter = query.stream
      ? {
          stream: {
            in: [query.stream, Stream.COMMON],
          },
        }
      : {};

    const list = await this.prisma.course.findMany({
      where: {
        semester_id: query.semesterId,
        status: PublicationStatus.PUBLISHED,
        ...streamFilter,
      },
      orderBy: { sort_order: "asc" },
      select: {
        id: true,
        semester_id: true,
        code: true,
        title_en: true,
        title_am: true,
        description_en: true,
        description_am: true,
        stream: true,
        is_promotional: true,
        trial_expiry_days: true,
        sort_order: true,
      },
    });

    return list.map((c) => ({
      id: c.id,
      semesterId: c.semester_id,
      code: c.code,
      title: c.title_en,
      titleEn: c.title_en,
      titleAm: c.title_am,
      descriptionEn: c.description_en,
      descriptionAm: c.description_am,
      stream: c.stream,
      isPromotional: c.is_promotional,
      trialExpiryDays: c.trial_expiry_days,
      sortOrder: c.sort_order,
    }));
  }

  async getCourseById(id: string): Promise<CourseResponse> {
    const c = await this.prisma.course.findUnique({
      where: { id },
      select: {
        id: true,
        semester_id: true,
        code: true,
        title_en: true,
        title_am: true,
        description_en: true,
        description_am: true,
        stream: true,
        is_promotional: true,
        trial_expiry_days: true,
        sort_order: true,
      },
    });

    if (!c) {
      throw new NotFoundException(`Course not found with ID ${id}`);
    }

    return {
      id: c.id,
      semesterId: c.semester_id,
      code: c.code,
      title: c.title_en,
      titleEn: c.title_en,
      titleAm: c.title_am,
      descriptionEn: c.description_en,
      descriptionAm: c.description_am,
      stream: c.stream,
      isPromotional: c.is_promotional,
      trialExpiryDays: c.trial_expiry_days,
      sortOrder: c.sort_order,
    };
  }

  // --------------------------------------------------------------------------
  // Admin APIs (Universities, Programs, Semesters, Courses)
  // --------------------------------------------------------------------------

  // ---- Universities ----

  async listAdminUniversities(
    query?: PaginationQueryDto,
  ): Promise<AdminUniversityDto[] | PaginatedResult<AdminUniversityDto>> {
    const orderBy: any = [{ sort_order: "asc" }, { id: "asc" }];
    if (query?.page || query?.pageSize) {
      const page = Math.max(1, query.page ?? 1);
      const pageSize = Math.min(100, Math.max(1, query.pageSize ?? 10));
      const skip = (page - 1) * pageSize;
      const [total, list] = await Promise.all([
        this.prisma.university.count(),
        this.prisma.university.findMany({
          skip,
          take: pageSize,
          orderBy,
          include: {
            _count: { select: { programs: true } },
          },
        }),
      ]);
      const items: AdminUniversityDto[] = list.map((u) => ({
        id: u.id,
        name: u.name_en,
        shortName: u.code,
        logoUrl: u.logo_url ?? undefined,
        status: u.status === PublicationStatus.DRAFT ? "DRAFT" : "PUBLISHED",
        programCount: u._count.programs,
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

    const list = await this.prisma.university.findMany({
      orderBy,
      include: {
        _count: { select: { programs: true } },
      },
    });

    return list.map((u) => ({
      id: u.id,
      name: u.name_en,
      shortName: u.code,
      logoUrl: u.logo_url ?? undefined,
      status: u.status === PublicationStatus.DRAFT ? "DRAFT" : "PUBLISHED",
      programCount: u._count.programs,
    }));
  }

  async createAdminUniversity(
    adminId: string,
    input: UniversityInputDto,
  ): Promise<AdminUniversityDto> {
    const existing = await this.prisma.university.findFirst({
      where: {
        OR: [
          { code: input.shortName.trim().toUpperCase() },
          { name_en: input.name.trim() },
        ],
      },
    });

    if (existing) {
      throw new ConflictException({
        errorCode: "NAME_DUPLICATE",
        message: "University code or name already exists",
      });
    }

    const university = await this.prisma.university.create({
      data: {
        code: input.shortName.trim().toUpperCase(),
        name_en: input.name.trim(),
        name_am: input.name.trim(),
        status:
          input.status === "DRAFT"
            ? PublicationStatus.DRAFT
            : PublicationStatus.PUBLISHED,
      },
    });

    await this.auditService.log({
      actorId: adminId,
      actorRole: Role.ADMIN,
      action: "CATALOG_ADDED",
      targetType: "University",
      targetId: university.id,
      metadata: { target: `University ${university.code}`, name: university.name_en },
    });

    return {
      id: university.id,
      name: university.name_en,
      shortName: university.code,
      logoUrl: university.logo_url ?? undefined,
      status: university.status === PublicationStatus.DRAFT ? "DRAFT" : "PUBLISHED",
      programCount: 0,
    };
  }

  async updateAdminUniversity(
    adminId: string,
    id: string,
    input: UniversityInputDto,
  ): Promise<AdminUniversityDto> {
    const university = await this.prisma.university.findUnique({
      where: { id },
      include: { _count: { select: { programs: true } } },
    });

    if (!university) {
      throw new NotFoundException(`University not found with ID ${id}`);
    }

    const beforeStatus =
      university.status === PublicationStatus.DRAFT ? "DRAFT" : "PUBLISHED";
    if (beforeStatus === "PUBLISHED" && input.status === "DRAFT" && !input.reason) {
      throw new BadRequestException("A reason is required to unpublish a university");
    }

    const conflict = await this.prisma.university.findFirst({
      where: {
        id: { not: id },
        OR: [
          { code: input.shortName.trim().toUpperCase() },
          { name_en: input.name.trim() },
        ],
      },
    });

    if (conflict) {
      throw new ConflictException({
        errorCode: "NAME_DUPLICATE",
        message: "University code or name already in use by another institution",
      });
    }

    const updated = await this.prisma.university.update({
      where: { id },
      data: {
        name_en: input.name.trim(),
        code: input.shortName.trim().toUpperCase(),
        status:
          input.status === "DRAFT"
            ? PublicationStatus.DRAFT
            : PublicationStatus.PUBLISHED,
      },
    });

    let auditAction = "CATALOG_UPDATED";
    if (beforeStatus === "DRAFT" && input.status === "PUBLISHED") {
      auditAction = "CATALOG_UPDATED";
    } else if (beforeStatus === "PUBLISHED" && input.status === "DRAFT") {
      auditAction = "CATALOG_UNPUBLISHED";
    }

    await this.auditService.log({
      actorId: adminId,
      actorRole: Role.ADMIN,
      action: auditAction,
      targetType: "University",
      targetId: id,
      metadata: { target: `University ${updated.code}`, reason: input.reason },
    });

    return {
      id: updated.id,
      name: updated.name_en,
      shortName: updated.code,
      logoUrl: updated.logo_url ?? undefined,
      status: updated.status === PublicationStatus.DRAFT ? "DRAFT" : "PUBLISHED",
      programCount: university._count.programs,
    };
  }

  async deleteAdminUniversity(adminId: string, id: string): Promise<AdminUniversityDto> {
    const university = await this.prisma.university.findUnique({
      where: { id },
      include: { _count: { select: { programs: true, students: true } } },
    });

    if (!university) {
      throw new NotFoundException(`University not found with ID ${id}`);
    }

    if (university._count.programs > 0 || university._count.students > 0) {
      throw new ConflictException({
        errorCode: "IN_USE",
        message: "University has existing programs or students and cannot be deleted",
      });
    }

    await this.prisma.university.delete({ where: { id } });

    await this.auditService.log({
      actorId: adminId,
      actorRole: Role.ADMIN,
      action: "CATALOG_DELETED",
      targetType: "University",
      targetId: id,
      metadata: { target: `University ${university.code}` },
    });

    return {
      id: university.id,
      name: university.name_en,
      shortName: university.code,
      logoUrl: university.logo_url ?? undefined,
      status: university.status === PublicationStatus.DRAFT ? "DRAFT" : "PUBLISHED",
      programCount: 0,
    };
  }

  // ---- Programs ----

  async listAdminPrograms(
    query?: PaginationQueryDto,
  ): Promise<AdminProgramDto[] | PaginatedResult<AdminProgramDto>> {
    const orderBy: any = [{ sort_order: "asc" }, { id: "asc" }];
    if (query?.page || query?.pageSize) {
      const page = Math.max(1, query.page ?? 1);
      const pageSize = Math.min(100, Math.max(1, query.pageSize ?? 10));
      const skip = (page - 1) * pageSize;
      const [total, list] = await Promise.all([
        this.prisma.program.count(),
        this.prisma.program.findMany({
          skip,
          take: pageSize,
          orderBy,
          include: {
            university: true,
            semesters: {
              include: { _count: { select: { courses: true } } },
            },
          },
        }),
      ]);
      const items: AdminProgramDto[] = list.map((p) => {
        const courseCount = p.semesters.reduce((acc, s) => acc + s._count.courses, 0);
        return {
          id: p.id,
          universityId: p.university_id,
          universityShortName: p.university.code,
          name: p.name_en,
          status: p.status === PublicationStatus.DRAFT ? "DRAFT" : "PUBLISHED",
          courseCount,
        };
      });
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

    const list = await this.prisma.program.findMany({
      orderBy,
      include: {
        university: true,
        semesters: {
          include: { _count: { select: { courses: true } } },
        },
      },
    });

    return list.map((p) => {
      const courseCount = p.semesters.reduce((acc, s) => acc + s._count.courses, 0);
      return {
        id: p.id,
        universityId: p.university_id,
        universityShortName: p.university.code,
        name: p.name_en,
        status: p.status === PublicationStatus.DRAFT ? "DRAFT" : "PUBLISHED",
        courseCount,
      };
    });
  }

  async createAdminProgram(adminId: string, input: ProgramInputDto): Promise<AdminProgramDto> {
    const university = await this.prisma.university.findUnique({
      where: { id: input.universityId },
    });

    if (!university) {
      throw new NotFoundException(`University not found with ID ${input.universityId}`);
    }

    const existing = await this.prisma.program.findFirst({
      where: {
        university_id: input.universityId,
        name_en: input.name.trim(),
      },
    });

    if (existing) {
      throw new ConflictException({
        errorCode: "NAME_DUPLICATE",
        message: "Program with this name already exists under the university",
      });
    }

    const program = await this.prisma.$transaction(async (tx) => {
      const p = await tx.program.create({
        data: {
          university_id: input.universityId,
          code: input.name.trim().slice(0, 8).toUpperCase().replace(/\s+/g, ""),
          name_en: input.name.trim(),
          name_am: input.name.trim(),
          status:
            input.status === "DRAFT"
              ? PublicationStatus.DRAFT
              : PublicationStatus.PUBLISHED,
        },
      });

      await tx.semester.createMany({
        data: [
          {
            program_id: p.id,
            code: "SEM1",
            name_en: "Semester 1",
            name_am: "ሴሚስተር 1",
            sort_order: 1,
            status: PublicationStatus.PUBLISHED,
          },
          {
            program_id: p.id,
            code: "SEM2",
            name_en: "Semester 2",
            name_am: "ሴሚስተር 2",
            sort_order: 2,
            status: PublicationStatus.PUBLISHED,
          },
        ],
      });

      return p;
    });

    await this.auditService.log({
      actorId: adminId,
      actorRole: Role.ADMIN,
      action: "CATALOG_ADDED",
      targetType: "Program",
      targetId: program.id,
      metadata: { target: `Program ${program.name_en} · ${university.code}` },
    });

    return {
      id: program.id,
      universityId: program.university_id,
      universityShortName: university.code,
      name: program.name_en,
      status: program.status === PublicationStatus.DRAFT ? "DRAFT" : "PUBLISHED",
      courseCount: 0,
    };
  }

  async updateAdminProgram(
    adminId: string,
    id: string,
    input: ProgramInputDto,
  ): Promise<AdminProgramDto> {
    const program = await this.prisma.program.findUnique({
      where: { id },
      include: {
        university: true,
        semesters: { include: { _count: { select: { courses: true } } } },
      },
    });

    if (!program) {
      throw new NotFoundException(`Program not found with ID ${id}`);
    }

    const beforeStatus = program.status === PublicationStatus.DRAFT ? "DRAFT" : "PUBLISHED";
    if (beforeStatus === "PUBLISHED" && input.status === "DRAFT" && !input.reason) {
      throw new BadRequestException("A reason is required to unpublish a program");
    }

    const conflict = await this.prisma.program.findFirst({
      where: {
        id: { not: id },
        university_id: program.university_id,
        name_en: input.name.trim(),
      },
    });

    if (conflict) {
      throw new ConflictException({
        errorCode: "NAME_DUPLICATE",
        message: "Program name is already used within this university",
      });
    }

    const updated = await this.prisma.program.update({
      where: { id },
      data: {
        name_en: input.name.trim(),
        status:
          input.status === "DRAFT"
            ? PublicationStatus.DRAFT
            : PublicationStatus.PUBLISHED,
      },
    });

    let auditAction = "CATALOG_UPDATED";
    if (beforeStatus === "DRAFT" && input.status === "PUBLISHED") {
      auditAction = "CATALOG_UPDATED";
    } else if (beforeStatus === "PUBLISHED" && input.status === "DRAFT") {
      auditAction = "CATALOG_UNPUBLISHED";
    }

    await this.auditService.log({
      actorId: adminId,
      actorRole: Role.ADMIN,
      action: auditAction,
      targetType: "Program",
      targetId: id,
      metadata: {
        target: `Program ${updated.name_en} · ${program.university.code}`,
        reason: input.reason,
      },
    });

    const courseCount = program.semesters.reduce((acc, s) => acc + s._count.courses, 0);
    return {
      id: updated.id,
      universityId: updated.university_id,
      universityShortName: program.university.code,
      name: updated.name_en,
      status: updated.status === PublicationStatus.DRAFT ? "DRAFT" : "PUBLISHED",
      courseCount,
    };
  }

  async deleteAdminProgram(adminId: string, id: string): Promise<AdminProgramDto> {
    const program = await this.prisma.program.findUnique({
      where: { id },
      include: {
        university: true,
        semesters: { include: { _count: { select: { courses: true } } } },
        _count: { select: { students: true } },
      },
    });

    if (!program) {
      throw new NotFoundException(`Program not found with ID ${id}`);
    }

    const courseCount = program.semesters.reduce((acc, s) => acc + s._count.courses, 0);
    if (courseCount > 0 || program._count.students > 0) {
      throw new ConflictException({
        errorCode: "IN_USE",
        message: "Program has existing courses or students and cannot be deleted",
      });
    }

    await this.prisma.program.delete({ where: { id } });

    await this.auditService.log({
      actorId: adminId,
      actorRole: Role.ADMIN,
      action: "CATALOG_DELETED",
      targetType: "Program",
      targetId: id,
      metadata: { target: `Program ${program.name_en} · ${program.university.code}` },
    });

    return {
      id: program.id,
      universityId: program.university_id,
      universityShortName: program.university.code,
      name: program.name_en,
      status: program.status === PublicationStatus.DRAFT ? "DRAFT" : "PUBLISHED",
      courseCount: 0,
    };
  }

  // ---- Semesters ----

  async listAdminSemesters(
    query?: PaginationQueryDto,
  ): Promise<AdminSemesterDto[] | PaginatedResult<AdminSemesterDto>> {
    const orderBy: any = [{ sort_order: "asc" }, { id: "asc" }];
    if (query?.page || query?.pageSize) {
      const page = Math.max(1, query.page ?? 1);
      const pageSize = Math.min(100, Math.max(1, query.pageSize ?? 10));
      const skip = (page - 1) * pageSize;
      const [total, list] = await Promise.all([
        this.prisma.semester.count(),
        this.prisma.semester.findMany({
          skip,
          take: pageSize,
          orderBy,
          include: {
            program: { include: { university: true } },
            courses: { select: { status: true } },
          },
        }),
      ]);
      const items: AdminSemesterDto[] = list.map((s) => {
        const match = s.code.match(/SEM(\d+)/i) || s.code.match(/(\d+)/);
        const parsedNum = match && match[1] ? parseInt(match[1], 10) : s.sort_order;
        const publishedCount = s.courses.filter(
          (c) => c.status === PublicationStatus.PUBLISHED,
        ).length;

        return {
          id: s.id,
          programId: s.program_id,
          programName: s.program.name_en,
          universityShortName: s.program.university.code,
          number: parsedNum === 2 ? 2 : 1,
          status: s.status === PublicationStatus.DRAFT ? "DRAFT" : "PUBLISHED",
          courseCount: s.courses.length,
          publishedCourseCount: publishedCount,
        };
      });
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

    const list = await this.prisma.semester.findMany({
      orderBy,
      include: {
        program: { include: { university: true } },
        courses: { select: { status: true } },
      },
    });

    return list.map((s) => {
      const match = s.code.match(/SEM(\d+)/i) || s.code.match(/(\d+)/);
      const parsedNum = match && match[1] ? parseInt(match[1], 10) : s.sort_order;
      const publishedCount = s.courses.filter(
        (c) => c.status === PublicationStatus.PUBLISHED,
      ).length;

      return {
        id: s.id,
        programId: s.program_id,
        programName: s.program.name_en,
        universityShortName: s.program.university.code,
        number: parsedNum === 2 ? 2 : 1,
        status: s.status === PublicationStatus.DRAFT ? "DRAFT" : "PUBLISHED",
        courseCount: s.courses.length,
        publishedCourseCount: publishedCount,
      };
    });
  }

  async updateAdminSemester(
    adminId: string,
    id: string,
    input: SemesterStatusDto,
  ): Promise<AdminSemesterDto> {
    const semester = await this.prisma.semester.findUnique({
      where: { id },
      include: {
        program: { include: { university: true } },
        courses: { select: { status: true } },
      },
    });

    if (!semester) {
      throw new NotFoundException(`Semester not found with ID ${id}`);
    }

    const beforeStatus = semester.status === PublicationStatus.DRAFT ? "DRAFT" : "PUBLISHED";
    if (beforeStatus === "PUBLISHED" && input.status === "DRAFT" && !input.reason) {
      throw new BadRequestException("A reason is required to unpublish a semester");
    }

    const updated = await this.prisma.semester.update({
      where: { id },
      data: {
        status:
          input.status === "DRAFT"
            ? PublicationStatus.DRAFT
            : PublicationStatus.PUBLISHED,
      },
    });

    let auditAction = "CATALOG_UPDATED";
    if (beforeStatus === "DRAFT" && input.status === "PUBLISHED") {
      auditAction = "CATALOG_UPDATED";
    } else if (beforeStatus === "PUBLISHED" && input.status === "DRAFT") {
      auditAction = "CATALOG_UNPUBLISHED";
    }

    const match = semester.code.match(/SEM(\d+)/i) || semester.code.match(/(\d+)/);
    const num = match && match[1] ? parseInt(match[1], 10) : semester.sort_order;
    const semesterNumber: 1 | 2 = num === 2 ? 2 : 1;

    await this.auditService.log({
      actorId: adminId,
      actorRole: Role.ADMIN,
      action: auditAction,
      targetType: "Semester",
      targetId: id,
      metadata: {
        target: `Semester ${semesterNumber} · ${semester.program.name_en} · ${semester.program.university.code}`,
        reason: input.reason,
      },
    });

    const publishedCount = semester.courses.filter(
      (c) => c.status === PublicationStatus.PUBLISHED,
    ).length;

    return {
      id: updated.id,
      programId: semester.program_id,
      programName: semester.program.name_en,
      universityShortName: semester.program.university.code,
      number: semesterNumber,
      status: updated.status === PublicationStatus.DRAFT ? "DRAFT" : "PUBLISHED",
      courseCount: semester.courses.length,
      publishedCourseCount: publishedCount,
    };
  }

  async deleteAdminSemester(adminId: string, id: string): Promise<AdminSemesterDto> {
    const semester = await this.prisma.semester.findUnique({
      where: { id },
      include: {
        program: { include: { university: true } },
        _count: { select: { courses: true, students: true } },
      },
    });

    if (!semester) {
      throw new NotFoundException(`Semester not found with ID ${id}`);
    }

    if (semester._count.courses > 0 || semester._count.students > 0) {
      throw new ConflictException({
        errorCode: "IN_USE",
        message: "Semester has existing courses or students and cannot be deleted",
      });
    }

    await this.prisma.semester.delete({ where: { id } });

    const match = semester.code.match(/SEM(\d+)/i) || semester.code.match(/(\d+)/);
    const num = match && match[1] ? parseInt(match[1], 10) : semester.sort_order;
    const semesterNumber: 1 | 2 = num === 2 ? 2 : 1;

    await this.auditService.log({
      actorId: adminId,
      actorRole: Role.ADMIN,
      action: "CATALOG_DELETED",
      targetType: "Semester",
      targetId: id,
      metadata: {
        target: `Semester ${semesterNumber} · ${semester.program.name_en} · ${semester.program.university.code}`,
      },
    });

    return {
      id: semester.id,
      programId: semester.program_id,
      programName: semester.program.name_en,
      universityShortName: semester.program.university.code,
      number: semesterNumber,
      status: semester.status === PublicationStatus.DRAFT ? "DRAFT" : "PUBLISHED",
      courseCount: 0,
      publishedCourseCount: 0,
    };
  }

  // ---- Courses ----

  async listAdminCourses(query: CourseListQueryDto): Promise<CourseListResultDto> {
    const page = Math.max(1, query.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, query.pageSize ?? 10));
    const skip = (page - 1) * pageSize;

    const where: any = {};

    if (query.q && query.q.trim()) {
      const text = query.q.trim();
      where.OR = [
        { code: { contains: text, mode: "insensitive" } },
        { title_en: { contains: text, mode: "insensitive" } },
      ];
    }

    if (query.universityId) {
      if (query.universityId === "ALL") {
        where.semester = { program: { university: { code: "ALL" } } };
      } else {
        where.semester = { program: { university_id: query.universityId } };
      }
    }

    if (query.programId) {
      where.semester = { ...where.semester, program_id: query.programId };
    }

    if (query.semesterNumber) {
      where.semester = {
        ...where.semester,
        OR: [
          { sort_order: query.semesterNumber },
          { code: { contains: String(query.semesterNumber) } },
        ],
      };
    }

    if (query.stream) {
      where.stream = query.stream as Stream;
    }

    if (query.status) {
      where.status =
        query.status === "DRAFT"
          ? PublicationStatus.DRAFT
          : PublicationStatus.PUBLISHED;
    }

    const [total, courses] = await Promise.all([
      this.prisma.course.count({ where }),
      this.prisma.course.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: [{ created_at: "desc" }, { id: "asc" }],
        include: {
          semester: {
            include: {
              program: { include: { university: true } },
            },
          },
        },
      }),
    ]);

    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const items = courses.map((c) => this._mapToAdminCourse(c));

    return {
      items,
      total,
      page,
      pageSize,
      totalPages,
      pageCount: totalPages,
    };
  }

  async createAdminCourse(adminId: string, input: CreateCourseDto): Promise<AdminCourseDto> {
    let semesterId = input.semesterId;

    if (input.universityId === "ALL") {
      const semesterNum = input.semesterNumber || 1;
      let allUni = await this.prisma.university.findUnique({ where: { code: "ALL" } });
      if (!allUni) {
        allUni = await this.prisma.university.create({
          data: {
            code: "ALL",
            name_en: "All Universities",
            name_am: "ሁሉንም ዩኒቨርሲቲዎች",
            status: PublicationStatus.PUBLISHED,
          },
        });
      }

      let allProg = await this.prisma.program.findFirst({
        where: { university_id: allUni.id, code: "COMMON" },
      });
      if (!allProg) {
        allProg = await this.prisma.program.create({
          data: {
            university_id: allUni.id,
            code: "COMMON",
            name_en: "Common Curriculum",
            name_am: "የጋራ ትምህርት",
            status: PublicationStatus.PUBLISHED,
          },
        });
      }

      let allSem = await this.prisma.semester.findFirst({
        where: { program_id: allProg.id, sort_order: semesterNum },
      });
      if (!allSem) {
        allSem = await this.prisma.semester.create({
          data: {
            program_id: allProg.id,
            code: `ALL-S${semesterNum}`,
            name_en: `Semester ${semesterNum}`,
            name_am: `ሴሚስተር ${semesterNum}`,
            sort_order: semesterNum,
            status: PublicationStatus.PUBLISHED,
          },
        });
      }

      semesterId = allSem.id;
    }

    if (!semesterId) {
      throw new BadRequestException("semesterId is required");
    }

    const semester = await this.prisma.semester.findUnique({
      where: { id: semesterId },
      include: { program: { include: { university: true } } },
    });

    if (!semester) {
      throw new NotFoundException(`Semester not found with ID ${semesterId}`);
    }

    const code = input.code.trim().toUpperCase();
    const existing = await this.prisma.course.findFirst({
      where: {
        semester_id: semesterId,
        code,
      },
    });

    if (existing) {
      throw new ConflictException({
        errorCode: "CODE_DUPLICATE",
        message: `Course with code ${code} already exists in this semester`,
      });
    }

    const course = await this.prisma.course.create({
      data: {
        semester_id: semesterId,
        code,
        title_en: input.title.trim(),
        title_am: input.title.trim(),
        stream: input.stream as Stream,
        is_promotional: input.freeTrialItems > 0,
        trial_expiry_days: input.freeTrialItems,
        status:
          input.status === "DRAFT"
            ? PublicationStatus.DRAFT
            : PublicationStatus.PUBLISHED,
      },
      include: {
        semester: {
          include: { program: { include: { university: true } } },
        },
      },
    });

    const uniCode = course.semester.program.university.code;
    await this.auditService.log({
      actorId: adminId,
      actorRole: Role.ADMIN,
      action: "COURSE_CREATED",
      targetType: "Course",
      targetId: course.id,
      metadata: { target: `${course.code} · ${uniCode}`, title: course.title_en },
    });

    return this._mapToAdminCourse(course);
  }

  async updateAdminCourse(
    adminId: string,
    id: string,
    input: UpdateCourseDto,
  ): Promise<AdminCourseDto> {
    const course = await this.prisma.course.findUnique({
      where: { id },
      include: {
        semester: {
          include: { program: { include: { university: true } } },
        },
      },
    });

    if (!course) {
      throw new NotFoundException(`Course not found with ID ${id}`);
    }

    const beforeStatus = course.status === PublicationStatus.DRAFT ? "DRAFT" : "PUBLISHED";
    if (beforeStatus === "PUBLISHED" && input.status === "DRAFT" && !input.reason) {
      throw new BadRequestException("A reason is required to unpublish a course");
    }

    const code = input.code.trim().toUpperCase();
    const conflict = await this.prisma.course.findFirst({
      where: {
        id: { not: id },
        semester_id: course.semester_id,
        code,
      },
    });

    if (conflict) {
      throw new ConflictException({
        errorCode: "CODE_DUPLICATE",
        message: `Course with code ${code} already exists in this semester`,
      });
    }

    const updated = await this.prisma.course.update({
      where: { id },
      data: {
        code,
        title_en: input.title.trim(),
        title_am: input.title.trim(),
        stream: input.stream as Stream,
        is_promotional: input.freeTrialItems > 0,
        trial_expiry_days: input.freeTrialItems,
        status:
          input.status === "DRAFT"
            ? PublicationStatus.DRAFT
            : PublicationStatus.PUBLISHED,
      },
      include: {
        semester: {
          include: { program: { include: { university: true } } },
        },
      },
    });

    let auditAction = "COURSE_UPDATED";
    if (beforeStatus === "DRAFT" && input.status === "PUBLISHED") {
      auditAction = "COURSE_PUBLISHED";
    } else if (beforeStatus === "PUBLISHED" && input.status === "DRAFT") {
      auditAction = "COURSE_UNPUBLISHED";
    }

    const uniCode = updated.semester.program.university.code;
    await this.auditService.log({
      actorId: adminId,
      actorRole: Role.ADMIN,
      action: auditAction,
      targetType: "Course",
      targetId: id,
      metadata: {
        target: `${updated.code} · ${uniCode}`,
        reason: input.reason,
      },
    });

    return this._mapToAdminCourse(updated);
  }

  async deleteAdminCourse(adminId: string, id: string): Promise<AdminCourseDto> {
    const course = await this.prisma.course.findUnique({
      where: { id },
      include: {
        semester: {
          include: { program: { include: { university: true } } },
        },
        _count: { select: { student_courses: true, order_items: true, entitlements: true } },
      },
    });

    if (!course) {
      throw new NotFoundException(`Course not found with ID ${id}`);
    }

    const inUse =
      course._count.student_courses > 0 ||
      course._count.order_items > 0 ||
      course._count.entitlements > 0;

    if (inUse) {
      throw new ConflictException({
        errorCode: "IN_USE",
        message: "Course has enrolled students or purchase history and cannot be deleted",
      });
    }

    await this.prisma.course.delete({ where: { id } });

    const uniCode = course.semester.program.university.code;
    await this.auditService.log({
      actorId: adminId,
      actorRole: Role.ADMIN,
      action: "COURSE_DELETED",
      targetType: "Course",
      targetId: id,
      metadata: { target: `${course.code} · ${uniCode}` },
    });

    return this._mapToAdminCourse(course);
  }

  // --------------------------------------------------------------------------
  // Private Helpers
  // --------------------------------------------------------------------------

  private _mapToAdminCourse(course: any): AdminCourseDto {
    const semester = course.semester;
    const program = semester?.program;
    const university = program?.university;

    const isAll = university?.code === "ALL";
    const match = semester?.code?.match(/SEM(\d+)/i) || semester?.code?.match(/(\d+)/);
    const parsedNum = match && match[1] ? parseInt(match[1], 10) : semester?.sort_order;
    const semesterNumber: 1 | 2 = parsedNum === 2 ? 2 : 1;

    let stream: "NATURAL" | "SOCIAL" | "COMMON" = "COMMON";
    if (course.stream === Stream.NATURAL) stream = "NATURAL";
    else if (course.stream === Stream.SOCIAL) stream = "SOCIAL";
    else stream = "COMMON";

    return {
      id: course.id,
      semesterId: course.semester_id,
      programId: isAll ? null : program?.id ?? null,
      programName: isAll ? null : program?.name_en ?? null,
      universityId: isAll ? "ALL" : university?.id ?? "",
      universityShortName: isAll ? "ALL" : university?.code ?? "",
      semesterNumber,
      code: course.code,
      title: course.title_en,
      stream,
      promotional: course.is_promotional,
      freeTrialItems: course.trial_expiry_days ?? 0,
      status: course.status === PublicationStatus.DRAFT ? "DRAFT" : "PUBLISHED",
    };
  }
}
