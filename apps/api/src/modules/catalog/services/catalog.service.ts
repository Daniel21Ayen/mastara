import { Injectable, NotFoundException, Logger } from "@nestjs/common";
import { PrismaService } from "../../../infrastructure/database/prisma.service";
import { PublicationStatus, Stream } from "@mastara/database";
import { GetCoursesQueryDto } from "../dto/get-courses-query.dto";

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

  constructor(private readonly prisma: PrismaService) {}

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
}
