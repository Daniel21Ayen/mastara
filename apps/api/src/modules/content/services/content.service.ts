import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from "@nestjs/common";
import { PrismaService } from "../../../infrastructure/database/prisma.service";
import { EntitlementStatus, PublicationStatus } from "@mastara/database";
import { canOpenContent, AccessState } from "@mastara/domain";
import { RecordProgressDto } from "../dto/record-progress.dto";

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

@Injectable()
export class ContentService {
  private readonly logger = new Logger(ContentService.name);

  constructor(private readonly prisma: PrismaService) {}

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
}
