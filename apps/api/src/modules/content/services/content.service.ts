import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from "@nestjs/common";
import { PrismaService } from "../../../infrastructure/database/prisma.service";
import { EntitlementStatus, PublicationStatus, Role } from "@mastara/database";
import {
  canOpenContent,
  AccessState,
  CatalogStatus,
  AuditAction,
  statusChange,
  needsReasonToChange,
  missingForPublish,
  nextVersion,
  QUIZ_COUNT,
  CONTENT_RECENT_LIMIT,
  ADMIN_ERROR_CODES,
} from "@mastara/domain";
import type {
  ContentCourse,
  ContentSummary,
  ContentUpdate,
  AdminModule,
  AdminTopic,
  AdminNote,
} from "@mastara/contracts";
import { RecordProgressDto } from "../dto/record-progress.dto";
import {
  AdminModuleInputDto,
  AdminTopicInputDto,
  AdminNoteInputDto,
  AdminAmharicNoteInputDto,
} from "../dto/admin-content.dto";

export interface BilingualTextResponse {
  en: string;
  am: string;
}

export interface TopicListItemResponse {
  id: string;
  courseId: string;
  moduleId: string;
  kind: "MODULE" | "NOTE";
  number: number;
  title: BilingualTextResponse;
  summary: BilingualTextResponse;
  isFree: boolean;
  isCompleted: boolean;
  scrollPosition: number;
}

export interface TopicDetailResponse {
  id: string;
  courseId: string;
  moduleId: string;
  kind: "MODULE" | "NOTE";
  number: number;
  title: BilingualTextResponse;
  summary: BilingualTextResponse;
  body: BilingualTextResponse;
  isFree: boolean;
  accessState: AccessState;
  readingProgress?: {
    scrollPosition: number;
    isCompleted: boolean;
  };
}

export interface RecordProgressResponse {
  success: boolean;
  topicId: string;
  scrollPosition: number;
  isCompleted: boolean;
}

function editAction(
  before: CatalogStatus,
  after: CatalogStatus,
  updated: AuditAction,
): AuditAction {
  const change = statusChange(before, after);
  if (change === "PUBLISH") return "CONTENT_PUBLISHED";
  if (change === "UNPUBLISH") return "CONTENT_UNPUBLISHED";
  return updated;
}

@Injectable()
export class ContentService {
  private readonly logger = new Logger(ContentService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ============================================================================
  // Mobile / Student Content Delivery Methods
  // ============================================================================

  private async getStudentAccessState(
    studentId: string,
    courseId: string,
  ): Promise<AccessState> {
    const activeEntitlement = await this.prisma.entitlement.findFirst({
      where: {
        student_id: studentId,
        course_id: courseId,
        status: EntitlementStatus.ACTIVE,
        expires_at: { gt: new Date() },
      },
      select: { id: true },
    });

    return activeEntitlement ? "PAID" : "FREE_TRIAL";
  }

  async getCourseTopics(
    studentId: string,
    courseId: string,
    kind: "MODULE" | "NOTE" = "MODULE",
  ): Promise<TopicListItemResponse[]> {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      select: { id: true },
    });

    if (!course) {
      throw new NotFoundException(`Course not found with ID ${courseId}`);
    }

    const modules = await this.prisma.module.findMany({
      where: {
        course_id: courseId,
        status: PublicationStatus.PUBLISHED,
      },
      orderBy: { sort_order: "asc" },
      include: {
        topics: {
          orderBy: { chapter_number: "asc" },
        },
      },
    });

    const topicIds = modules.flatMap((m) => m.topics.map((t) => t.id));

    const progressRecords = await this.prisma.readingProgress.findMany({
      where: {
        student_id: studentId,
        topic_id: { in: topicIds },
      },
      select: {
        topic_id: true,
        is_completed: true,
        scroll_position: true,
      },
    });

    const progressMap = new Map(
      progressRecords.map((p) => [
        p.topic_id,
        { isCompleted: p.is_completed, scrollPosition: p.scroll_position },
      ]),
    );

    const result: TopicListItemResponse[] = [];

    for (const mod of modules) {
      for (const topic of mod.topics) {
        const progress = progressMap.get(topic.id);
        const isFree = topic.is_free_trial || mod.is_free_trial;

        result.push({
          id: topic.id,
          courseId,
          moduleId: mod.id,
          kind,
          number: topic.chapter_number,
          title: {
            en: topic.title_en,
            am: topic.title_am,
          },
          summary: {
            en: mod.description_en || topic.title_en,
            am: mod.description_am || topic.title_am,
          },
          isFree,
          isCompleted: progress ? progress.isCompleted : false,
          scrollPosition: progress ? progress.scrollPosition : 0,
        });
      }
    }

    return result;
  }

  async getTopic(
    studentId: string,
    topicId: string,
  ): Promise<TopicDetailResponse> {
    const topic = await this.prisma.topic.findUnique({
      where: { id: topicId },
      include: {
        module: {
          select: {
            id: true,
            course_id: true,
            is_free_trial: true,
            description_en: true,
            description_am: true,
          },
        },
        contents: {
          where: { status: PublicationStatus.PUBLISHED },
          orderBy: { version: "desc" },
          take: 1,
        },
      },
    });

    if (!topic) {
      throw new NotFoundException(`Topic not found with ID ${topicId}`);
    }

    const latestContent = topic.contents[0] || null;
    const isFree =
      topic.is_free_trial ||
      topic.module.is_free_trial ||
      Boolean(latestContent?.is_free_trial);

    const accessState = await this.getStudentAccessState(
      studentId,
      topic.module.course_id,
    );

    if (!canOpenContent(accessState, isFree)) {
      throw new ForbiddenException({
        errorCode: "CONTENT_LOCKED",
        message:
          "This content is locked and requires an active subscription or entitlement",
      });
    }

    const progress = await this.prisma.readingProgress.findUnique({
      where: {
        student_id_topic_id: {
          student_id: studentId,
          topic_id: topicId,
        },
      },
      select: {
        scroll_position: true,
        is_completed: true,
      },
    });

    return {
      id: topic.id,
      courseId: topic.module.course_id,
      moduleId: topic.module.id,
      kind: "MODULE",
      number: topic.chapter_number,
      title: {
        en: topic.title_en,
        am: topic.title_am,
      },
      summary: {
        en: topic.module.description_en || topic.title_en,
        am: topic.module.description_am || topic.title_am,
      },
      body: {
        en: latestContent?.body_en || "",
        am: latestContent?.body_am || "",
      },
      isFree,
      accessState,
      readingProgress: progress
        ? {
            scrollPosition: progress.scroll_position,
            isCompleted: progress.is_completed,
          }
        : undefined,
    };
  }

  async recordProgress(
    studentId: string,
    topicId: string,
    dto: RecordProgressDto,
  ): Promise<RecordProgressResponse> {
    const topic = await this.prisma.topic.findUnique({
      where: { id: topicId },
      select: { id: true },
    });

    if (!topic) {
      throw new NotFoundException(`Topic not found with ID ${topicId}`);
    }

    const scrollPosition = dto.scrollPosition ?? 0;
    const isCompleted = dto.isCompleted ?? false;

    await this.prisma.readingProgress.upsert({
      where: {
        student_id_topic_id: {
          student_id: studentId,
          topic_id: topicId,
        },
      },
      update: {
        scroll_position: scrollPosition,
        is_completed: isCompleted,
        ...(isCompleted ? { completed_at: new Date() } : {}),
        last_read_at: new Date(),
      },
      create: {
        student_id: studentId,
        topic_id: topicId,
        scroll_position: scrollPosition,
        is_completed: isCompleted,
        ...(isCompleted ? { completed_at: new Date() } : {}),
        last_read_at: new Date(),
      },
    });

    return {
      success: true,
      topicId,
      scrollPosition,
      isCompleted,
    };
  }

  // ============================================================================
  // Admin Content Management Methods
  // ============================================================================

  async listAdminCourses(): Promise<ContentCourse[]> {
    const courses = await this.prisma.course.findMany({
      include: {
        semester: {
          include: {
            program: {
              include: {
                university: true,
              },
            },
          },
        },
      },
      orderBy: [{ code: "asc" }],
    });

    return courses.map((course) => {
      const program = course.semester?.program;
      const university = program?.university;
      const isAll = !university || university.code === "ALL";

      return {
        id: course.id,
        code: course.code,
        title: course.title_en,
        programName: isAll ? "Common / All Programs" : (program?.name_en ?? "General Studies"),
        universityShortName: isAll ? "ALL" : (university?.code ?? "ALL"),
      };
    });
  }

  private async resolveCourseId(courseId: string): Promise<string> {
    const isIdUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(courseId.trim());
    if (isIdUuid) return courseId.trim();
    const course = await this.prisma.course.findFirst({
      where: { code: { equals: courseId.trim(), mode: "insensitive" } },
      select: { id: true },
    });
    return course?.id ?? courseId.trim();
  }

  async getAdminContentSummary(courseId: string): Promise<ContentSummary> {
    const resolvedId = await this.resolveCourseId(courseId);
    const course = await this.prisma.course.findUnique({
      where: { id: resolvedId },
      select: { id: true, code: true, title_en: true },
    });

    if (!course) {
      throw new NotFoundException(`Course not found with ID ${courseId}`);
    }

    const modules = await this.prisma.module.findMany({
      where: { course_id: resolvedId },
      include: {
        topics: {
          include: {
            contents: {
              orderBy: { version: "desc" },
            },
          },
        },
      },
      orderBy: { sort_order: "asc" },
    });

    const publishedModuleCount = modules.filter(
      (m) => m.status === PublicationStatus.PUBLISHED,
    ).length;

    const allTopics = modules.flatMap((m) => m.topics);
    const topicCount = allTopics.length;
    const noteCount = allTopics.length;

    const amharicNoteCount = allTopics.filter((t) => {
      const latest = t.contents[0];
      return Boolean(t.title_am?.trim() && latest?.body_am?.trim());
    }).length;

    const updates: (ContentUpdate & { ms: number })[] = [
      ...modules.map((m) => ({
        id: m.id,
        kind: "MODULE" as const,
        title: `Module ${m.sort_order} · ${m.title_en}`,
        moduleNumber: m.sort_order,
        at: m.updated_at.toISOString(),
        ms: m.updated_at.getTime(),
      })),
      ...allTopics.map((t) => {
        const latest = t.contents[0];
        const hasAm = Boolean(t.title_am?.trim() && latest?.body_am?.trim());
        const parentModule = modules.find((m) => m.id === t.module_id);
        return {
          id: t.id,
          kind: hasAm ? ("AMHARIC_NOTE" as const) : ("NOTE" as const),
          title: hasAm ? t.title_am : t.title_en,
          moduleNumber: parentModule?.sort_order ?? 1,
          at: t.updated_at.toISOString(),
          ms: t.updated_at.getTime(),
        };
      }),
    ];

    const recent = updates
      .sort((a, b) => b.ms - a.ms)
      .slice(0, CONTENT_RECENT_LIMIT)
      .map(({ ms: _ms, ...rest }) => rest);

    return {
      courseId,
      moduleCount: modules.length,
      publishedModuleCount,
      topicCount,
      noteCount,
      amharicNoteCount,
      quizCount: QUIZ_COUNT,
      recent,
    };
  }

  async listAdminModules(courseId: string): Promise<AdminModule[]> {
    const resolvedId = await this.resolveCourseId(courseId);
    const modules = await this.prisma.module.findMany({
      where: { course_id: resolvedId },
      include: {
        topics: {
          orderBy: { chapter_number: "asc" },
          include: {
            contents: {
              orderBy: { version: "desc" },
              take: 1,
            },
          },
        },
      },
      orderBy: { sort_order: "asc" },
    });

    return modules.map((m) => ({
      id: m.id,
      courseId: m.course_id,
      number: m.sort_order,
      title: { en: m.title_en, am: m.title_am },
      status: m.status as CatalogStatus,
      topics: m.topics.map((t) => ({
        id: t.id,
        moduleId: m.id,
        number: t.chapter_number,
        code: `${m.sort_order}.${t.chapter_number}`,
        title: { en: t.title_en, am: t.title_am },
      })),
      notes: m.topics.map((t) => ({
        id: t.id,
        title: t.title_en,
      })),
      updatedAt: m.updated_at.toISOString(),
    }));
  }

  async createAdminModule(
    input: AdminModuleInputDto,
    adminId?: string,
  ): Promise<AdminModule> {
    const course = await this.prisma.course.findUnique({
      where: { id: input.courseId },
      select: { id: true, code: true },
    });

    if (!course) {
      throw new NotFoundException(`Course not found with ID ${input.courseId}`);
    }

    const lastModule = await this.prisma.module.findFirst({
      where: { course_id: input.courseId },
      orderBy: { sort_order: "desc" },
      select: { sort_order: true },
    });
    const sortOrder = (lastModule?.sort_order ?? 0) + 1;

    const module = await this.prisma.module.create({
      data: {
        course_id: input.courseId,
        code: `MOD-${sortOrder}`,
        title_en: input.title.en.trim(),
        title_am: input.title.am.trim(),
        status: input.status as PublicationStatus,
        sort_order: sortOrder,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        actor_id: adminId || "00000000-0000-0000-0000-000000000000",
        actor_role: Role.ADMIN,
        action: "MODULE_CREATED",
        target_type: "Module",
        target_id: module.id,
        metadata: {
          target: `Module ${sortOrder} · ${course.code}`,
          reason: input.reason,
        },
      },
    });

    return {
      id: module.id,
      courseId: module.course_id,
      number: module.sort_order,
      title: { en: module.title_en, am: module.title_am },
      status: module.status as CatalogStatus,
      topics: [],
      notes: [],
      updatedAt: module.updated_at.toISOString(),
    };
  }

  async updateAdminModule(
    id: string,
    input: AdminModuleInputDto,
    adminId?: string,
  ): Promise<AdminModule> {
    const module = await this.prisma.module.findUnique({
      where: { id },
      include: {
        course: { select: { code: true } },
        topics: {
          orderBy: { chapter_number: "asc" },
        },
      },
    });

    if (!module) {
      throw new NotFoundException(`Module not found with ID ${id}`);
    }

    const beforeStatus = module.status as CatalogStatus;
    if (needsReasonToChange(beforeStatus, input.status) && !input.reason) {
      throw new BadRequestException({
        errorCode: ADMIN_ERROR_CODES.VALIDATION_FAILED,
        message: "Reason is required when unpublishing a module",
      });
    }

    const updated = await this.prisma.module.update({
      where: { id },
      data: {
        title_en: input.title.en.trim(),
        title_am: input.title.am.trim(),
        status: input.status as PublicationStatus,
      },
      include: {
        topics: {
          orderBy: { chapter_number: "asc" },
          include: {
            contents: {
              orderBy: { version: "desc" },
              take: 1,
            },
          },
        },
      },
    });

    const action = editAction(beforeStatus, input.status, "MODULE_UPDATED");
    await this.prisma.auditLog.create({
      data: {
        actor_id: adminId || "00000000-0000-0000-0000-000000000000",
        actor_role: Role.ADMIN,
        action,
        target_type: "Module",
        target_id: updated.id,
        metadata: {
          target: `Module ${updated.sort_order} · ${module.course.code}`,
          reason: input.reason,
        },
      },
    });

    return {
      id: updated.id,
      courseId: updated.course_id,
      number: updated.sort_order,
      title: { en: updated.title_en, am: updated.title_am },
      status: updated.status as CatalogStatus,
      topics: updated.topics.map((t) => ({
        id: t.id,
        moduleId: updated.id,
        number: t.chapter_number,
        code: `${updated.sort_order}.${t.chapter_number}`,
        title: { en: t.title_en, am: t.title_am },
      })),
      notes: updated.topics.map((t) => ({
        id: t.id,
        title: t.title_en,
      })),
      updatedAt: updated.updated_at.toISOString(),
    };
  }

  async createAdminTopic(
    input: AdminTopicInputDto,
    adminId?: string,
  ): Promise<AdminTopic> {
    const parentModule = await this.prisma.module.findUnique({
      where: { id: input.moduleId },
      include: { course: { select: { code: true } } },
    });

    if (!parentModule) {
      throw new NotFoundException(`Module not found with ID ${input.moduleId}`);
    }

    const lastTopic = await this.prisma.topic.findFirst({
      where: { module_id: input.moduleId },
      orderBy: { chapter_number: "desc" },
      select: { chapter_number: true },
    });
    const chapterNumber = (lastTopic?.chapter_number ?? 0) + 1;

    const topic = await this.prisma.topic.create({
      data: {
        module_id: input.moduleId,
        chapter_number: chapterNumber,
        title_en: input.title.en.trim(),
        title_am: input.title.am.trim(),
        sort_order: chapterNumber,
        contents: {
          create: {
            version: 0,
            status: PublicationStatus.DRAFT,
            title_en: input.title.en.trim(),
            title_am: input.title.am.trim(),
            body_en: "",
            body_am: "",
          },
        },
      },
    });

    await this.prisma.auditLog.create({
      data: {
        actor_id: adminId || "00000000-0000-0000-0000-000000000000",
        actor_role: Role.ADMIN,
        action: "TOPIC_ADDED",
        target_type: "Topic",
        target_id: topic.id,
        metadata: {
          target: `Topic ${parentModule.sort_order}.${chapterNumber} · ${parentModule.course.code}`,
        },
      },
    });

    return {
      id: topic.id,
      moduleId: topic.module_id,
      number: topic.chapter_number,
      code: `${parentModule.sort_order}.${topic.chapter_number}`,
      title: { en: topic.title_en, am: topic.title_am },
    };
  }

  async listAdminNotes(courseId: string): Promise<AdminNote[]> {
    const resolvedId = await this.resolveCourseId(courseId);
    const topics = await this.prisma.topic.findMany({
      where: {
        module: { course_id: resolvedId },
      },
      include: {
        module: true,
        contents: {
          orderBy: { version: "desc" },
          take: 1,
        },
      },
      orderBy: { updated_at: "desc" },
    });

    return topics.map((t) => {
      const latest = t.contents[0];
      const status = (latest?.status ?? t.module.status) as CatalogStatus;
      const version = latest?.version ?? 0;

      return {
        id: t.id,
        courseId,
        moduleId: t.module_id,
        moduleNumber: t.module.sort_order,
        title: { en: t.title_en, am: t.title_am },
        body: { en: latest?.body_en ?? "", am: latest?.body_am ?? "" },
        isFree: t.is_free_trial || Boolean(latest?.is_free_trial),
        status,
        version,
        updatedAt: t.updated_at.toISOString(),
      };
    });
  }

  async createAdminNote(
    input: AdminNoteInputDto,
    adminId?: string,
  ): Promise<AdminNote> {
    const parentModule = await this.prisma.module.findUnique({
      where: { id: input.moduleId },
      include: { course: { select: { code: true } } },
    });

    if (!parentModule || parentModule.course_id !== input.courseId) {
      throw new NotFoundException("Parent module not found in specified course");
    }

    if (input.status === "PUBLISHED" && missingForPublish(input).length > 0) {
      throw new BadRequestException({
        errorCode: ADMIN_ERROR_CODES.VALIDATION_FAILED,
        message: "Publishing requires English and Amharic titles and bodies",
      });
    }

    const version = input.status === "PUBLISHED" ? 1 : 0;
    const lastTopic = await this.prisma.topic.findFirst({
      where: { module_id: input.moduleId },
      orderBy: { chapter_number: "desc" },
      select: { chapter_number: true },
    });
    const chapterNumber = (lastTopic?.chapter_number ?? 0) + 1;

    const topic = await this.prisma.topic.create({
      data: {
        module_id: input.moduleId,
        chapter_number: chapterNumber,
        title_en: input.title.en.trim(),
        title_am: input.title.am.trim(),
        is_free_trial: input.isFree,
        sort_order: chapterNumber,
        contents: {
          create: {
            version,
            status: input.status as PublicationStatus,
            title_en: input.title.en.trim(),
            title_am: input.title.am.trim(),
            body_en: input.body.en.trim(),
            body_am: input.body.am.trim(),
            is_free_trial: input.isFree,
            published_at: input.status === "PUBLISHED" ? new Date() : null,
          },
        },
      },
      include: {
        module: true,
        contents: true,
      },
    });

    const isPublished = input.status === "PUBLISHED";
    await this.prisma.auditLog.create({
      data: {
        actor_id: adminId || "00000000-0000-0000-0000-000000000000",
        actor_role: Role.ADMIN,
        action: isPublished ? "CONTENT_PUBLISHED" : "NOTE_CREATED",
        target_type: "Note",
        target_id: topic.id,
        metadata: {
          target: isPublished
            ? `Note · ${input.title.en} · v${version}`
            : `Note · ${input.title.en}`,
          reason: input.reason,
        },
      },
    });

    return {
      id: topic.id,
      courseId: input.courseId,
      moduleId: topic.module_id,
      moduleNumber: parentModule.sort_order,
      title: { en: topic.title_en, am: topic.title_am },
      body: { en: input.body.en.trim(), am: input.body.am.trim() },
      isFree: topic.is_free_trial,
      status: input.status,
      version,
      updatedAt: topic.updated_at.toISOString(),
    };
  }

  async updateAdminNote(
    id: string,
    input: AdminNoteInputDto,
    adminId?: string,
  ): Promise<AdminNote> {
    const topic = await this.prisma.topic.findUnique({
      where: { id },
      include: {
        module: true,
        contents: {
          orderBy: { version: "desc" },
        },
      },
    });

    if (!topic) {
      throw new NotFoundException(`Note/Topic not found with ID ${id}`);
    }

    const latest = topic.contents[0];
    const beforeStatus = (latest?.status ?? topic.module.status) as CatalogStatus;

    if (needsReasonToChange(beforeStatus, input.status) && !input.reason) {
      throw new BadRequestException({
        errorCode: ADMIN_ERROR_CODES.VALIDATION_FAILED,
        message: "Reason is required when unpublishing a note",
      });
    }

    if (input.status === "PUBLISHED" && missingForPublish(input).length > 0) {
      throw new BadRequestException({
        errorCode: ADMIN_ERROR_CODES.VALIDATION_FAILED,
        message: "Publishing requires English and Amharic titles and bodies",
      });
    }

    const currentVersion = latest?.version ?? 0;
    const newVersion = nextVersion(currentVersion, input.status);

    await this.prisma.topic.update({
      where: { id },
      data: {
        module_id: input.moduleId,
        title_en: input.title.en.trim(),
        title_am: input.title.am.trim(),
        is_free_trial: input.isFree,
      },
    });

    let finalContent = latest;
    if (newVersion > currentVersion || !latest) {
      finalContent = await this.prisma.content.create({
        data: {
          topic_id: topic.id,
          version: newVersion,
          status: input.status as PublicationStatus,
          title_en: input.title.en.trim(),
          title_am: input.title.am.trim(),
          body_en: input.body.en.trim(),
          body_am: input.body.am.trim(),
          is_free_trial: input.isFree,
          published_at: input.status === "PUBLISHED" ? new Date() : null,
        },
      });
    } else {
      finalContent = await this.prisma.content.update({
        where: { id: latest.id },
        data: {
          title_en: input.title.en.trim(),
          title_am: input.title.am.trim(),
          body_en: input.body.en.trim(),
          body_am: input.body.am.trim(),
          status: input.status as PublicationStatus,
          is_free_trial: input.isFree,
        },
      });
    }

    const action =
      input.status === "PUBLISHED"
        ? "CONTENT_PUBLISHED"
        : editAction(beforeStatus, input.status, "NOTE_UPDATED");

    await this.prisma.auditLog.create({
      data: {
        actor_id: adminId || "00000000-0000-0000-0000-000000000000",
        actor_role: Role.ADMIN,
        action,
        target_type: "Note",
        target_id: topic.id,
        metadata: {
          target:
            input.status === "PUBLISHED"
              ? `Note · ${input.title.en} · v${newVersion}`
              : `Note · ${input.title.en}`,
          reason: input.reason,
        },
      },
    });

    const targetModule =
      input.moduleId === topic.module_id
        ? topic.module
        : await this.prisma.module.findUnique({ where: { id: input.moduleId } });

    return {
      id: topic.id,
      courseId: input.courseId,
      moduleId: input.moduleId,
      moduleNumber: targetModule?.sort_order ?? 1,
      title: { en: input.title.en.trim(), am: input.title.am.trim() },
      body: { en: input.body.en.trim(), am: input.body.am.trim() },
      isFree: input.isFree,
      status: input.status,
      version: newVersion,
      updatedAt: finalContent.updated_at.toISOString(),
    };
  }

  async saveAdminAmharicNote(
    id: string,
    input: AdminAmharicNoteInputDto,
    adminId?: string,
  ): Promise<AdminNote> {
    const topic = await this.prisma.topic.findUnique({
      where: { id },
      include: {
        module: true,
        contents: {
          orderBy: { version: "desc" },
        },
      },
    });

    if (!topic) {
      throw new NotFoundException(`Note/Topic not found with ID ${id}`);
    }

    const latest = topic.contents[0];
    const currentStatus = (latest?.status ?? topic.module.status) as CatalogStatus;
    const currentVersion = latest?.version ?? 0;
    const newVersion = nextVersion(currentVersion, currentStatus);

    await this.prisma.topic.update({
      where: { id },
      data: { title_am: input.title.trim() },
    });

    let finalContent = latest;
    if (newVersion > currentVersion || !latest) {
      finalContent = await this.prisma.content.create({
        data: {
          topic_id: topic.id,
          version: newVersion,
          status: currentStatus as PublicationStatus,
          title_en: latest?.title_en ?? topic.title_en,
          title_am: input.title.trim(),
          body_en: latest?.body_en ?? "",
          body_am: input.body.trim(),
          is_free_trial: topic.is_free_trial,
          published_at: currentStatus === "PUBLISHED" ? new Date() : null,
        },
      });
    } else {
      finalContent = await this.prisma.content.update({
        where: { id: latest.id },
        data: {
          title_am: input.title.trim(),
          body_am: input.body.trim(),
        },
      });
    }

    const action = currentStatus === "PUBLISHED" ? "CONTENT_PUBLISHED" : "NOTE_UPDATED";
    await this.prisma.auditLog.create({
      data: {
        actor_id: adminId || "00000000-0000-0000-0000-000000000000",
        actor_role: Role.ADMIN,
        action,
        target_type: "Note",
        target_id: topic.id,
        metadata: {
          target:
            currentStatus === "PUBLISHED"
              ? `Amharic note · ${finalContent.title_en} · v${newVersion}`
              : `Amharic note · ${finalContent.title_en}`,
        },
      },
    });

    return {
      id: topic.id,
      courseId: topic.module.course_id,
      moduleId: topic.module_id,
      moduleNumber: topic.module.sort_order,
      title: { en: finalContent.title_en ?? '', am: input.title.trim() },
      body: { en: finalContent.body_en ?? '', am: input.body.trim() },
      isFree: topic.is_free_trial,
      status: currentStatus,
      version: newVersion,
      updatedAt: finalContent.updated_at.toISOString(),
    };
  }
}
