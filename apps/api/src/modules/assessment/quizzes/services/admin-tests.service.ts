import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from "@nestjs/common";
import { PrismaService } from "../../../../infrastructure/database/prisma.service";
import { Role } from "@mastara/database";
import {
  CatalogStatus,
  AuditAction,
  statusChange,
  needsReasonToChange,
  canPublishQuiz,
  questionProblems,
  QuestionDraft,
  toStudentType,
  TESTS_PAGE_SIZE,
  QUIZ_MINUTES_DEFAULT,
  CONTENT_RECENT_LIMIT,
  ADMIN_ERROR_CODES,
  QuizNumber,
} from "@mastara/domain";
import type {
  AdminQuestion,
  QuizSummary,
  TestsOverview,
  TestUpdate,
  QuestionListResult,
} from "@mastara/contracts";
import {
  AdminQuestionInputDto,
  AdminQuizSettingsInputDto,
  AdminQuestionListQueryDto,
} from "../dto/admin-tests.dto";

const QUIZ_NUMBERS_LIST: readonly QuizNumber[] = [1, 2, 3];

@Injectable()
export class AdminTestsService {
  private readonly logger = new Logger(AdminTestsService.name);

  constructor(private readonly prisma: PrismaService) {}

  private mapToAdminQuestion(
    q: any,
    nextId: string | null = null,
  ): AdminQuestion {
    const meta = (q.correct_answers as any) || {};
    const topicLabel = q.topic
      ? `${q.topic.module?.sort_order ?? 1}.${q.topic.chapter_number} ${q.topic.title_en}`
      : "General Topic";

    return {
      id: q.id,
      courseId: q.course_id,
      courseCode: q.course?.code ?? q.course_id,
      courseTitle: q.course?.title_en ?? q.course_id,
      quizNo: (meta.quizNo ?? 1) as QuizNumber,
      topicId: q.topic_id ?? "",
      topicLabel,
      title: meta.title ?? q.prompt_en.slice(0, 40),
      form: meta.form ?? (q.type === "TRUE_FALSE" ? "TRUE_FALSE" : "MULTIPLE_CHOICE"),
      prompt: q.prompt_en,
      options: Array.isArray(q.options) ? (q.options as string[]) : [],
      correctOption: meta.correctOption !== undefined ? meta.correctOption : null,
      trueIsCorrect: meta.trueIsCorrect !== undefined ? meta.trueIsCorrect : null,
      acceptedAnswers: Array.isArray(meta.acceptedAnswers) ? meta.acceptedAnswers : [],
      status: (meta.status ?? (q.is_active ? "PUBLISHED" : "DRAFT")) as CatalogStatus,
      updatedAt: q.updated_at.toISOString(),
      nextId,
    };
  }

  async getOverview(courseId: string): Promise<TestsOverview> {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      select: { id: true, code: true, title_en: true },
    });

    if (!course) {
      throw new NotFoundException(`Course not found with ID ${courseId}`);
    }

    const allQuestions = await this.prisma.question.findMany({
      where: { course_id: courseId },
      include: {
        course: true,
        topic: { include: { module: true } },
      },
      orderBy: { created_at: "asc" },
    });

    const quizzes: QuizSummary[] = [];

    for (const quizNo of QUIZ_NUMBERS_LIST) {
      const inQuiz = allQuestions.filter(
        (q) => ((q.correct_answers as any)?.quizNo ?? 1) === quizNo,
      );
      const questionCount = inQuiz.length;
      const publishedQuestionCount = inQuiz.filter((q) => {
        const meta = (q.correct_answers as any) || {};
        return meta.status === "PUBLISHED" || (meta.status === undefined && q.is_active);
      }).length;

      const setting = await this.prisma.systemSetting.findUnique({
        where: { key: `quiz:${courseId}:${quizNo}` },
      });

      const minutes =
        (setting?.value as any)?.minutes ??
        (quizNo === 1 ? 15 : quizNo === 2 ? 20 : QUIZ_MINUTES_DEFAULT);

      const status =
        (setting?.value as any)?.status ??
        (publishedQuestionCount > 0 ? "PUBLISHED" : "DRAFT");

      quizzes.push({
        quizNo,
        questionCount,
        publishedQuestionCount,
        minutes,
        status,
      });
    }

    const recent: TestUpdate[] = allQuestions
      .sort((a, b) => b.updated_at.getTime() - a.updated_at.getTime())
      .slice(0, CONTENT_RECENT_LIMIT)
      .map((q) => {
        const meta = (q.correct_answers as any) || {};
        return {
          id: q.id,
          quizNo: (meta.quizNo ?? 1) as QuizNumber,
          title: meta.title ?? q.prompt_en.slice(0, 40),
          status: (meta.status ?? (q.is_active ? "PUBLISHED" : "DRAFT")) as CatalogStatus,
          at: q.updated_at.toISOString(),
        };
      });

    return {
      courseId,
      quizzes,
      recent,
    };
  }

  async updateQuiz(
    courseId: string,
    quizNo: QuizNumber,
    input: AdminQuizSettingsInputDto,
    adminId?: string,
  ): Promise<QuizSummary> {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      select: { id: true, code: true },
    });

    if (!course) {
      throw new NotFoundException(`Course not found with ID ${courseId}`);
    }

    const existingSetting = await this.prisma.systemSetting.findUnique({
      where: { key: `quiz:${courseId}:${quizNo}` },
    });
    const beforeStatus = ((existingSetting?.value as any)?.status ?? "DRAFT") as CatalogStatus;

    if (needsReasonToChange(beforeStatus, input.status) && !input.reason) {
      throw new BadRequestException({
        errorCode: ADMIN_ERROR_CODES.VALIDATION_FAILED,
        message: "Reason is required when unpublishing a quiz",
      });
    }

    const allQuestions = await this.prisma.question.findMany({
      where: { course_id: courseId },
    });

    const inQuiz = allQuestions.filter(
      (q) => ((q.correct_answers as any)?.quizNo ?? 1) === quizNo,
    );
    const publishedQuestionCount = inQuiz.filter((q) => {
      const meta = (q.correct_answers as any) || {};
      return meta.status === "PUBLISHED" || (meta.status === undefined && q.is_active);
    }).length;

    if (input.status === "PUBLISHED" && !canPublishQuiz(publishedQuestionCount)) {
      throw new BadRequestException({
        errorCode: ADMIN_ERROR_CODES.VALIDATION_FAILED,
        message: "A quiz must have at least one published question before publishing",
      });
    }

    await this.prisma.systemSetting.upsert({
      where: { key: `quiz:${courseId}:${quizNo}` },
      update: {
        value: { minutes: input.minutes, status: input.status },
        updated_by: adminId,
      },
      create: {
        key: `quiz:${courseId}:${quizNo}`,
        value: { minutes: input.minutes, status: input.status },
        updated_by: adminId,
      },
    });

    const change = statusChange(beforeStatus, input.status);
    const action: AuditAction =
      change === "PUBLISH"
        ? "QUIZ_PUBLISHED"
        : change === "UNPUBLISH"
          ? "QUIZ_UNPUBLISHED"
          : "QUIZ_UPDATED";

    await this.prisma.auditLog.create({
      data: {
        actor_id: adminId || "00000000-0000-0000-0000-000000000000",
        actor_role: Role.ADMIN,
        action,
        target_type: "Quiz",
        target_id: `${courseId}:quiz-${quizNo}`,
        metadata: {
          target: `Quiz ${quizNo} · ${course.code}`,
          reason: input.reason,
        },
      },
    });

    return {
      quizNo,
      questionCount: inQuiz.length,
      publishedQuestionCount,
      minutes: input.minutes,
      status: input.status,
    };
  }

  async listQuestions(
    query: AdminQuestionListQueryDto,
  ): Promise<QuestionListResult> {
    const whereClause: any = {};
    if (query.courseId) whereClause.course_id = query.courseId;

    const rawQuestions = await this.prisma.question.findMany({
      where: whereClause,
      include: {
        course: true,
        topic: { include: { module: true } },
      },
      orderBy: { created_at: "asc" },
    });

    const filtered = rawQuestions.filter((q) => {
      const meta = (q.correct_answers as any) || {};
      const qQuizNo = (meta.quizNo ?? 1) as QuizNumber;
      if (qQuizNo !== query.quizNo) return false;

      const qForm =
        meta.form ?? (q.type === "TRUE_FALSE" ? "TRUE_FALSE" : "MULTIPLE_CHOICE");
      if (query.form && qForm !== query.form) return false;

      const qStatus = (meta.status ?? (q.is_active ? "PUBLISHED" : "DRAFT")) as CatalogStatus;
      if (query.status && qStatus !== query.status) return false;

      if (query.q?.trim()) {
        const term = query.q.trim().toLowerCase();
        const topicLabel = q.topic
          ? `${q.topic.module?.sort_order ?? 1}.${q.topic.chapter_number} ${q.topic.title_en}`
          : "";
        const fullText = `${q.id} ${meta.title ?? ""} ${q.prompt_en} ${topicLabel}`.toLowerCase();
        if (!fullText.includes(term)) return false;
      }
      return true;
    });

    const total = filtered.length;
    const pageCount = Math.max(1, Math.ceil(total / TESTS_PAGE_SIZE));
    const page = Math.min(query.page ?? 1, pageCount);
    const start = (page - 1) * TESTS_PAGE_SIZE;
    const pageItems = filtered.slice(start, start + TESTS_PAGE_SIZE);

    const items = pageItems.map((q) => {
      const sameCourseQuiz = filtered.filter((item) => item.course_id === q.course_id);
      const curIdx = sameCourseQuiz.findIndex((item) => item.id === q.id);
      const nextQuestion =
        curIdx >= 0 && curIdx < sameCourseQuiz.length - 1 ? sameCourseQuiz[curIdx + 1] : null;

      return this.mapToAdminQuestion(q, nextQuestion?.id ?? null);
    });

    return {
      items,
      total,
      page,
      pageCount,
    };
  }

  async getQuestion(id: string): Promise<AdminQuestion> {
    const question = await this.prisma.question.findUnique({
      where: { id },
      include: {
        course: true,
        topic: { include: { module: true } },
      },
    });

    if (!question) {
      throw new NotFoundException(`Question not found with ID ${id}`);
    }

    const sameCourseQuiz = await this.prisma.question.findMany({
      where: { course_id: question.course_id },
      orderBy: { created_at: "asc" },
    });

    const curIdx = sameCourseQuiz.findIndex((item) => item.id === question.id);
    const nextQuestion =
      curIdx >= 0 && curIdx < sameCourseQuiz.length - 1 ? sameCourseQuiz[curIdx + 1] : null;

    return this.mapToAdminQuestion(question, nextQuestion?.id ?? null);
  }

  async createQuestion(
    input: AdminQuestionInputDto,
    adminId?: string,
  ): Promise<AdminQuestion> {
    const course = await this.prisma.course.findUnique({
      where: { id: input.courseId },
      select: { id: true, code: true, title_en: true },
    });

    if (!course) {
      throw new NotFoundException(`Course not found with ID ${input.courseId}`);
    }

    const topic = await this.prisma.topic.findUnique({
      where: { id: input.topicId },
      include: { module: true },
    });

    if (!topic || topic.module.course_id !== input.courseId) {
      throw new NotFoundException("Topic does not belong to specified course");
    }

    if (input.status === "PUBLISHED") {
      const draft: QuestionDraft = {
        form: input.form,
        prompt: input.prompt,
        options: input.options,
        correctOption: input.correctOption ?? null,
        trueIsCorrect: input.trueIsCorrect ?? null,
        acceptedAnswers: input.acceptedAnswers ?? [],
      };
      const problems = questionProblems(draft);
      if (problems.length > 0) {
        throw new BadRequestException({
          errorCode: ADMIN_ERROR_CODES.VALIDATION_FAILED,
          message: `Question cannot be published: missing ${problems.join(", ")}`,
        });
      }
    }

    const studentType = toStudentType(input.form);
    const created = await this.prisma.question.create({
      data: {
        course_id: input.courseId,
        topic_id: input.topicId,
        type: studentType as any,
        prompt_en: input.prompt.trim(),
        options: input.form === "MULTIPLE_CHOICE" ? input.options.map((o) => o.trim()) : [],
        correct_answers: {
          quizNo: input.quizNo,
          title: input.title.trim(),
          form: input.form,
          correctOption: input.correctOption ?? null,
          trueIsCorrect: input.trueIsCorrect ?? null,
          acceptedAnswers: input.acceptedAnswers ?? [],
          status: input.status,
        },
        is_active: input.status === "PUBLISHED",
      },
      include: {
        course: true,
        topic: { include: { module: true } },
      },
    });

    const isPublished = input.status === "PUBLISHED";
    await this.prisma.auditLog.create({
      data: {
        actor_id: adminId || "00000000-0000-0000-0000-000000000000",
        actor_role: Role.ADMIN,
        action: isPublished ? "QUESTION_PUBLISHED" : "QUESTION_CREATED",
        target_type: "Question",
        target_id: created.id,
        metadata: {
          target: `Question ${created.id} · Quiz ${input.quizNo} · ${course.code}`,
          reason: input.reason,
        },
      },
    });

    return this.mapToAdminQuestion(created, null);
  }

  async updateQuestion(
    id: string,
    input: AdminQuestionInputDto,
    adminId?: string,
  ): Promise<AdminQuestion> {
    const question = await this.prisma.question.findUnique({
      where: { id },
      include: {
        course: true,
        topic: { include: { module: true } },
      },
    });

    if (!question) {
      throw new NotFoundException(`Question not found with ID ${id}`);
    }

    const meta = (question.correct_answers as any) || {};
    const beforeStatus = (meta.status ?? (question.is_active ? "PUBLISHED" : "DRAFT")) as CatalogStatus;

    if (needsReasonToChange(beforeStatus, input.status) && !input.reason) {
      throw new BadRequestException({
        errorCode: ADMIN_ERROR_CODES.VALIDATION_FAILED,
        message: "Reason is required when unpublishing a question",
      });
    }

    if (input.status === "PUBLISHED") {
      const draft: QuestionDraft = {
        form: input.form,
        prompt: input.prompt,
        options: input.options,
        correctOption: input.correctOption ?? null,
        trueIsCorrect: input.trueIsCorrect ?? null,
        acceptedAnswers: input.acceptedAnswers ?? [],
      };
      const problems = questionProblems(draft);
      if (problems.length > 0) {
        throw new BadRequestException({
          errorCode: ADMIN_ERROR_CODES.VALIDATION_FAILED,
          message: `Question cannot be published: missing ${problems.join(", ")}`,
        });
      }
    }

    const studentType = toStudentType(input.form);
    const updated = await this.prisma.question.update({
      where: { id },
      data: {
        topic_id: input.topicId,
        type: studentType as any,
        prompt_en: input.prompt.trim(),
        options: input.form === "MULTIPLE_CHOICE" ? input.options.map((o) => o.trim()) : [],
        correct_answers: {
          quizNo: input.quizNo,
          title: input.title.trim(),
          form: input.form,
          correctOption: input.correctOption ?? null,
          trueIsCorrect: input.trueIsCorrect ?? null,
          acceptedAnswers: input.acceptedAnswers ?? [],
          status: input.status,
        },
        is_active: input.status === "PUBLISHED",
      },
      include: {
        course: true,
        topic: { include: { module: true } },
      },
    });

    const change = statusChange(beforeStatus, input.status);
    const action: AuditAction =
      change === "PUBLISH"
        ? "QUESTION_PUBLISHED"
        : change === "UNPUBLISH"
          ? "QUESTION_UNPUBLISHED"
          : "QUESTION_UPDATED";

    await this.prisma.auditLog.create({
      data: {
        actor_id: adminId || "00000000-0000-0000-0000-000000000000",
        actor_role: Role.ADMIN,
        action,
        target_type: "Question",
        target_id: updated.id,
        metadata: {
          target: `Question ${updated.id} · Quiz ${input.quizNo} · ${question.course.code}`,
          reason: input.reason,
        },
      },
    });

    return this.mapToAdminQuestion(updated, null);
  }
}
