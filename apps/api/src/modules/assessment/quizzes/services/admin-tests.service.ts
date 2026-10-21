import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from "@nestjs/common";
import { PrismaService } from "../../../../infrastructure/database/prisma.service";
import { Role, ExamKind, PublicationStatus } from "@mastara/database";
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
  SET_PAGE_SIZE,
  setProblems,
  QUIZ_MINUTES_DEFAULT,
  CONTENT_RECENT_LIMIT,
  ADMIN_ERROR_CODES,
  QuizNumber,
  ExamSetKind,
  Stream,
  QuestionForm,
} from "@mastara/domain";
import type {
  AdminQuestion,
  QuizSummary,
  TestsOverview,
  TestUpdate,
  QuestionListResult,
  ExamSet,
  ExamSetListResult,
  ExamQuestion,
} from "@mastara/contracts";
import {
  AdminQuestionInputDto,
  AdminQuizSettingsInputDto,
  AdminQuestionListQueryDto,
  AdminExamSetListQueryDto,
  AdminExamSetInputDto,
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
    const isIdUuid = this.isUuid(courseId.trim());
    const course = await this.prisma.course.findFirst({
      where: isIdUuid ? { id: courseId.trim() } : { code: { equals: courseId.trim(), mode: "insensitive" } },
      select: { id: true, code: true, title_en: true },
    });

    if (!course) {
      throw new NotFoundException(`Course not found with ID or code ${courseId}`);
    }

    const allQuestions = await this.prisma.question.findMany({
      where: { course_id: course.id },
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
          target: `Question ${updated.id} · Quiz ${input.quizNo} · ${question.course?.code ?? ''}`,
          reason: input.reason,
        },
      },
    });

    return this.mapToAdminQuestion(updated, null);
  }

  private isUuid(val: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);
  }

  private mapToExamSet(exam: any): ExamSet {
    const setId =
      exam.title_en?.startsWith("SET-") || exam.title_en?.startsWith("EXAM-")
        ? exam.title_en
        : exam.id;

    const questions: ExamQuestion[] = (exam.exam_questions || []).map((eq: any) => {
      const q = eq.question;
      const meta = (q?.correct_answers as any) || {};
      return {
        id: meta.externalId || q?.id || eq.id,
        form: meta.form || (q?.type === "SINGLE_CHOICE" ? "MULTIPLE_CHOICE" : (q?.type || "MULTIPLE_CHOICE")),
        topic: meta.topic || q?.topic?.title_en || "General",
        prompt: q?.prompt_en || "",
        options: Array.isArray(q?.options) ? q.options : [],
        correctOption: meta.correctOption ?? null,
        trueIsCorrect: meta.trueIsCorrect ?? null,
        acceptedAnswers: Array.isArray(meta.acceptedAnswers) ? meta.acceptedAnswers : [],
        answerDescription: q?.explanation_en || undefined,
      };
    });

    return {
      id: setId,
      kind: exam.kind as ExamSetKind,
      universityId: exam.university_id ?? exam.course?.semester?.program?.university_id ?? "none",
      universityName: exam.university?.name_en ?? "All Universities",
      programId: exam.course?.semester?.program_id ?? "none",
      programName: exam.course?.semester?.program?.name_en ?? "General Program",
      semesterNumber: (exam.course?.semester?.number ?? 1) as 1 | 2,
      stream: (exam.course?.stream ?? "NATURAL") as Stream,
      courseId: exam.course_id ?? null,
      courseCode: exam.course?.code ?? null,
      courseTitle: exam.course?.title_en ?? null,
      year: exam.year ?? 2024,
      isFree: exam.is_free_trial ?? false,
      minutes: exam.duration_min ?? 60,
      status: exam.status as CatalogStatus,
      questions,
      updatedAt: exam.updated_at ? exam.updated_at.toISOString() : new Date().toISOString(),
    };
  }

  private mapToCocExamSet(cs: any): ExamSet {
    const setId =
      cs.title_en?.startsWith("SET-") || cs.title_en?.startsWith("COC-")
        ? cs.title_en
        : cs.id;

    const questions: ExamQuestion[] = (cs.coc_set_questions || []).map((csq: any) => {
      const q = csq.coc_question?.question;
      const meta = (q?.correct_answers as any) || {};
      return {
        id: meta.externalId || q?.id || csq.id,
        form: meta.form || (q?.type === "SINGLE_CHOICE" ? "MULTIPLE_CHOICE" : (q?.type || "MULTIPLE_CHOICE")),
        topic: meta.topic || q?.topic?.title_en || "Comprehensive",
        prompt: q?.prompt_en || "",
        options: Array.isArray(q?.options) ? q.options : [],
        correctOption: meta.correctOption ?? null,
        trueIsCorrect: meta.trueIsCorrect ?? null,
        acceptedAnswers: Array.isArray(meta.acceptedAnswers) ? meta.acceptedAnswers : [],
        answerDescription: q?.explanation_en || undefined,
      };
    });

    return {
      id: setId,
      kind: "COC" as ExamSetKind,
      universityId: "none",
      universityName: "National Assessment",
      programId: "none",
      programName: "Comprehensive Assessment",
      semesterNumber: 1,
      stream: "NATURAL",
      courseId: null,
      courseCode: null,
      courseTitle: null,
      year: cs.year ?? 2024,
      isFree: false,
      minutes: cs.duration_min ?? 120,
      status: cs.status as CatalogStatus,
      questions,
      updatedAt: cs.updated_at ? cs.updated_at.toISOString() : new Date().toISOString(),
    };
  }

  async listExamSets(query: AdminExamSetListQueryDto): Promise<ExamSetListResult> {
    const page = query.page && query.page > 0 ? query.page : 1;
    const pageSize = SET_PAGE_SIZE;
    const skip = (page - 1) * pageSize;

    if (query.kind === "COC") {
      const where: any = {};
      if (query.status) {
        where.status = query.status;
      }
      if (query.q && query.q.trim()) {
        const q = query.q.trim();
        where.OR = [
          { title_en: { contains: q, mode: "insensitive" } },
          { title_am: { contains: q, mode: "insensitive" } },
        ];
      }

      const [total, cocSets] = await Promise.all([
        this.prisma.cocSet.count({ where }),
        this.prisma.cocSet.findMany({
          where,
          skip,
          take: pageSize,
          orderBy: { updated_at: "desc" },
          include: {
            coc_set_questions: {
              include: {
                coc_question: {
                  include: {
                    question: { include: { topic: true } },
                  },
                },
              },
              orderBy: { sort_order: "asc" },
            },
          },
        }),
      ]);

      const items = cocSets.map((cs) => this.mapToCocExamSet(cs));
      return {
        items,
        total,
        page,
        pageCount: Math.ceil(total / pageSize) || 1,
      };
    } else {
      const where: any = {
        kind: query.kind as ExamKind,
      };
      if (query.status) {
        where.status = query.status;
      }
      if (query.q && query.q.trim()) {
        const q = query.q.trim();
        where.OR = [
          { title_en: { contains: q, mode: "insensitive" } },
          { course: { code: { contains: q, mode: "insensitive" } } },
          { course: { title_en: { contains: q, mode: "insensitive" } } },
        ];
      }

      const [total, exams] = await Promise.all([
        this.prisma.exam.count({ where }),
        this.prisma.exam.findMany({
          where,
          skip,
          take: pageSize,
          orderBy: { updated_at: "desc" },
          include: {
            course: {
              include: {
                semester: {
                  include: {
                    program: true,
                  },
                },
              },
            },
            university: true,
            exam_questions: {
              include: {
                question: { include: { topic: true } },
              },
              orderBy: { sort_order: "asc" },
            },
          },
        }),
      ]);

      const items = exams.map((exam) => this.mapToExamSet(exam));
      return {
        items,
        total,
        page,
        pageCount: Math.ceil(total / pageSize) || 1,
      };
    }
  }

  async findExamSet(id: string): Promise<ExamSet | null> {
    const cleanId = id.trim();
    const isIdUuid = this.isUuid(cleanId);

    // 1. Check Exam table
    const examWhere: any = isIdUuid
      ? { OR: [{ id: cleanId }, { title_en: cleanId }] }
      : { title_en: cleanId };

    const exam = await this.prisma.exam.findFirst({
      where: examWhere,
      include: {
        course: {
          include: {
            semester: {
              include: {
                program: true,
              },
            },
          },
        },
        university: true,
        exam_questions: {
          include: { question: { include: { topic: true } } },
          orderBy: { sort_order: "asc" },
        },
      },
    });
    if (exam) return this.mapToExamSet(exam);

    // 2. Check CocSet table
    const cocWhere: any = isIdUuid
      ? { OR: [{ id: cleanId }, { title_en: cleanId }] }
      : { title_en: cleanId };

    const cocSet = await this.prisma.cocSet.findFirst({
      where: cocWhere,
      include: {
        coc_set_questions: {
          include: {
            coc_question: {
              include: { question: { include: { topic: true } } },
            },
          },
          orderBy: { sort_order: "asc" },
        },
      },
    });
    if (cocSet) return this.mapToCocExamSet(cocSet);

    return null;
  }

  async getExamSet(id: string): Promise<ExamSet> {
    const set = await this.findExamSet(id);
    if (!set) {
      throw new NotFoundException(`Exam set not found with ID ${id}`);
    }
    return set;
  }

  async getQuestionOwner(questionId: string): Promise<{ ownerSetId: string | null }> {
    const cleanId = questionId.trim();
    const isIdUuid = this.isUuid(cleanId);

    const questions = await this.prisma.question.findMany({
      where: isIdUuid ? { id: cleanId } : {},
      include: {
        exam_questions: { include: { exam: true } },
        coc_question: {
          include: {
            coc_set_questions: { include: { coc_set: true } },
          },
        },
      },
    });

    for (const q of questions) {
      const meta = (q.correct_answers as any) || {};
      const matchesId = q.id === cleanId || meta.externalId === cleanId;
      if (matchesId) {
        if (q.exam_questions && q.exam_questions.length > 0) {
          const exam = q.exam_questions[0]?.exam;
          if (exam) return { ownerSetId: exam.title_en || exam.id };
        }
        if (q.coc_question && q.coc_question.coc_set_questions && q.coc_question.coc_set_questions.length > 0) {
          const cs = q.coc_question.coc_set_questions[0]?.coc_set;
          if (cs) return { ownerSetId: cs.title_en || cs.id };
        }
      }
    }

    if (!isIdUuid) {
      const rawMatches = await this.prisma.question.findMany({
        where: {
          correct_answers: {
            path: ["externalId"],
            equals: cleanId,
          },
        },
        include: {
          exam_questions: { include: { exam: true } },
          coc_question: {
            include: { coc_set_questions: { include: { coc_set: true } } },
          },
        },
      });

      for (const q of rawMatches) {
        if (q.exam_questions && q.exam_questions.length > 0) {
          const exam = q.exam_questions[0]?.exam;
          if (exam) return { ownerSetId: exam.title_en || exam.id };
        }
        if (q.coc_question && q.coc_question.coc_set_questions && q.coc_question.coc_set_questions.length > 0) {
          const cs = q.coc_question.coc_set_questions[0]?.coc_set;
          if (cs) return { ownerSetId: cs.title_en || cs.id };
        }
      }
    }

    return { ownerSetId: null };
  }

  private toPrismaQuestionType(form: QuestionForm): "SINGLE_CHOICE" | "TRUE_FALSE" | "SHORT_ANSWER" | "MULTIPLE_CHOICE" {
    switch (form) {
      case "MULTIPLE_CHOICE":
        return "SINGLE_CHOICE";
      case "TRUE_FALSE":
        return "TRUE_FALSE";
      case "SHORT_ANSWER":
      case "BLANK_SPACE":
      default:
        return "SHORT_ANSWER";
    }
  }

  async saveExamSet(input: AdminExamSetInputDto, adminId: string): Promise<ExamSet> {
    const isCoc = input.kind === "COC";
    const setId = input.id.trim();

    if (input.status === "PUBLISHED") {
      const problems = setProblems({
        kind: input.kind,
        questions: input.questions as any,
      });
      if (problems.length > 0) {
        throw new BadRequestException(
          `Exam set cannot be published with problems: ${problems.join(", ")}`,
        );
      }
    }

    const existing = await this.findExamSet(setId);
    if (existing) {
      if (needsReasonToChange(existing.status, input.status) && !input.reason) {
        throw new BadRequestException(
          "A reason is required to take a published exam set back to draft",
        );
      }
    }

    const beforeStatus: CatalogStatus = existing?.status ?? "DRAFT";

    if (isCoc) {
      let cocSet = await this.prisma.cocSet.findFirst({
        where: {
          OR: [{ title_en: setId }, ...(this.isUuid(setId) ? [{ id: setId }] : [])],
        },
      });

      if (cocSet) {
        cocSet = await this.prisma.cocSet.update({
          where: { id: cocSet.id },
          data: {
            title_en: setId,
            year: input.year ?? 2024,
            duration_min: input.minutes,
            status: input.status as PublicationStatus,
          },
        });
        await this.prisma.cocSetQuestion.deleteMany({
          where: { coc_set_id: cocSet.id },
        });
      } else {
        cocSet = await this.prisma.cocSet.create({
          data: {
            ...(this.isUuid(setId) ? { id: setId } : {}),
            title_en: setId,
            title_am: setId,
            year: input.year ?? 2024,
            duration_min: input.minutes,
            sample_question_count: Math.min(input.questions.length, 10),
            status: input.status as PublicationStatus,
          },
        });
      }

      const defaultCourse = await this.prisma.course.findFirst();
      const courseId = input.courseId || defaultCourse?.id || "00000000-0000-0000-0000-000000000000";

      for (const [idx, qInput] of input.questions.entries()) {
        const studentType = this.toPrismaQuestionType(qInput.form);
        const q = await this.prisma.question.create({
          data: {
            course_id: courseId,
            type: studentType as any,
            prompt_en: qInput.prompt.trim(),
            options: qInput.options,
            explanation_en: qInput.answerDescription || null,
            correct_answers: {
              externalId: qInput.id,
              form: qInput.form,
              topic: qInput.topic,
              correctOption: qInput.correctOption ?? null,
              trueIsCorrect: qInput.trueIsCorrect ?? null,
              acceptedAnswers: qInput.acceptedAnswers ?? [],
            },
          },
        });

        const cocQ = await this.prisma.cocQuestion.create({
          data: {
            question_id: q.id,
            course_id: q.course_id ?? courseId,
            year: input.year ?? 2024,
          },
        });

        await this.prisma.cocSetQuestion.create({
          data: {
            coc_set_id: cocSet.id,
            coc_question_id: cocQ.id,
            sort_order: idx + 1,
          },
        });
      }
    } else {
      if (!input.courseId) {
        throw new BadRequestException("courseId is required for Mid, Final, or Mock exams");
      }

      let exam = await this.prisma.exam.findFirst({
        where: {
          OR: [{ title_en: setId }, ...(this.isUuid(setId) ? [{ id: setId }] : [])],
        },
      });

      const universityId =
        input.universityId && this.isUuid(input.universityId)
          ? input.universityId
          : null;

      if (exam) {
        exam = await this.prisma.exam.update({
          where: { id: exam.id },
          data: {
            title_en: setId,
            course_id: input.courseId,
            university_id: universityId,
            kind: input.kind as ExamKind,
            year: input.year ?? 2024,
            duration_min: input.minutes,
            is_free_trial: input.isFree,
            status: input.status as PublicationStatus,
          },
        });
        await this.prisma.examQuestion.deleteMany({
          where: { exam_id: exam.id },
        });
      } else {
        exam = await this.prisma.exam.create({
          data: {
            ...(this.isUuid(setId) ? { id: setId } : {}),
            title_en: setId,
            course_id: input.courseId,
            university_id: universityId,
            kind: input.kind as ExamKind,
            year: input.year ?? 2024,
            duration_min: input.minutes,
            is_free_trial: input.isFree,
            status: input.status as PublicationStatus,
          },
        });
      }

      for (const [idx, qInput] of input.questions.entries()) {
        const studentType = this.toPrismaQuestionType(qInput.form);
        const q = await this.prisma.question.create({
          data: {
            course_id: input.courseId,
            type: studentType as any,
            prompt_en: qInput.prompt.trim(),
            options: qInput.options,
            explanation_en: qInput.answerDescription || null,
            correct_answers: {
              externalId: qInput.id,
              form: qInput.form,
              topic: qInput.topic,
              correctOption: qInput.correctOption ?? null,
              trueIsCorrect: qInput.trueIsCorrect ?? null,
              acceptedAnswers: qInput.acceptedAnswers ?? [],
            },
          },
        });

        await this.prisma.examQuestion.create({
          data: {
            exam_id: exam.id,
            question_id: q.id,
            sort_order: idx + 1,
            points: 1.0,
          },
        });
      }
    }

    const change = statusChange(beforeStatus, input.status);
    const action: AuditAction =
      change === "PUBLISH"
        ? "EXAM_SET_PUBLISHED"
        : change === "UNPUBLISH"
          ? "EXAM_SET_UNPUBLISHED"
          : existing
            ? "EXAM_SET_UPDATED"
            : "EXAM_SET_CREATED";

    await this.prisma.auditLog.create({
      data: {
        actor_id: adminId || "00000000-0000-0000-0000-000000000000",
        actor_role: Role.ADMIN,
        action,
        target_type: "ExamSet",
        target_id: setId,
        metadata: {
          target: `Exam set ${setId} · ${input.questions.length} questions`,
          reason: input.reason,
        },
      },
    });

    return this.getExamSet(setId);
  }
}

