import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../../../../infrastructure/database/prisma.service";
import {
  AttemptCategory,
  AttemptState,
  EntitlementStatus,
  PublicationStatus,
  QuestionType,
} from "@mastara/database";
import {
  gradeAnswer,
  scoreExam,
  Answer,
  ExamScore,
  ScorableQuestion,
  ScoreLine,
} from "@mastara/domain";
import {
  StartAttemptDto,
  SubmitAttemptDto,
  GetAttemptsQueryDto,
} from "../dto";
import {
  mapQuestionToContract,
  QuestionResponse,
  BilingualTextResponse,
} from "../../common/question-mapper";

export interface StartAttemptResponse {
  id: string;
  category: AttemptCategory;
  state: AttemptState;
  totalQuestions: number;
  serverStartedAt: Date;
  serverDeadlineAt: Date | null;
  durationMin: number | null;
}

export interface AttemptResultResponse {
  attemptId: string;
  category: AttemptCategory;
  state: AttemptState;
  score: number;
  correctCount: number;
  totalQuestions: number;
  percentage: number;
  isPassed: boolean;
  passingScore: number;
  isTampered: boolean;
  integrityMetadata: any;
  elapsedMs: number;
  serverStartedAt: Date;
  submittedAt: Date;
  byCourse: Record<string, ScoreLine>;
  answers?: AttemptAnswerReviewItem[];
}

export interface AttemptAnswerReviewItem {
  questionId: string;
  courseId: string;
  type: string;
  prompt: BilingualTextResponse;
  explanation?: BilingualTextResponse;
  options?: any;
  correctAnswers: any;
  selectedAnswers: string[];
  isCorrect: boolean;
  isFlagged: boolean;
}

export interface AttemptListItemResponse {
  id: string;
  category: AttemptCategory;
  state: AttemptState;
  score: number | null;
  correctCount: number | null;
  totalQuestions: number;
  isTampered: boolean;
  serverStartedAt: Date;
  serverDeadlineAt: Date | null;
  submittedAt: Date | null;
  createdAt: Date;
}

export interface PaginatedAttemptsResponse {
  items: AttemptListItemResponse[];
  total: number;
  page: number;
  limit: number;
}

@Injectable()
export class AttemptsService {
  private readonly logger = new Logger(AttemptsService.name);
  private readonly GRACE_PERIOD_MS = 60 * 1000; // 60 seconds network leeway

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Start a new assessment attempt with server-side deadline calculation and entitlement checks.
   */
  async startAttempt(
    studentId: string,
    dto: StartAttemptDto,
  ): Promise<StartAttemptResponse> {
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
      select: { id: true },
    });

    if (!student) {
      throw new NotFoundException(`Student not found with ID ${studentId}`);
    }

    let totalQuestions = 0;
    let durationMin: number | null = null;
    const serverStartedAt = new Date();
    let serverDeadlineAt: Date | null = null;

    switch (dto.category) {
      case AttemptCategory.EXAM: {
        if (!dto.examId) {
          throw new BadRequestException("examId is required for EXAM category");
        }

        const exam = await this.prisma.exam.findUnique({
          where: { id: dto.examId },
          include: {
            exam_questions: { select: { question_id: true } },
          },
        });

        if (!exam || exam.status !== PublicationStatus.PUBLISHED) {
          throw new NotFoundException(
            `Exam not found or unpublished with ID ${dto.examId}`,
          );
        }

        // Entitlement Check: free trial exams can be attempted freely; paid exams require active entitlement
        if (!exam.is_free_trial) {
          const activeEntitlement = await this.prisma.entitlement.findFirst({
            where: {
              student_id: studentId,
              course_id: exam.course_id,
              status: EntitlementStatus.ACTIVE,
              expires_at: { gt: new Date() },
            },
            select: { id: true },
          });

          if (!activeEntitlement) {
            throw new ForbiddenException({
              errorCode: "CONTENT_LOCKED",
              message:
                "This exam requires an active course entitlement or subscription",
            });
          }
        }

        totalQuestions = exam.exam_questions.length;
        durationMin = exam.duration_min;
        serverDeadlineAt = new Date(
          serverStartedAt.getTime() + durationMin * 60 * 1000,
        );
        break;
      }

      case AttemptCategory.COC: {
        if (!dto.cocSetId) {
          throw new BadRequestException("cocSetId is required for COC category");
        }

        const cocSet = await this.prisma.cocSet.findUnique({
          where: { id: dto.cocSetId },
          include: {
            coc_set_questions: {
              include: {
                coc_question: { select: { is_free_trial: true } },
              },
            },
          },
        });

        if (!cocSet || cocSet.status !== PublicationStatus.PUBLISHED) {
          throw new NotFoundException(
            `COC set not found or unpublished with ID ${dto.cocSetId}`,
          );
        }

        totalQuestions = cocSet.coc_set_questions.length;
        durationMin = cocSet.duration_min;
        if (cocSet.is_timed && durationMin > 0) {
          serverDeadlineAt = new Date(
            serverStartedAt.getTime() + durationMin * 60 * 1000,
          );
        }
        break;
      }

      case AttemptCategory.QUIZ: {
        if (!dto.topicId && dto.quizNo === undefined) {
          throw new BadRequestException(
            "topicId or quizNo is required for QUIZ category",
          );
        }

        if (dto.topicId) {
          const topic = await this.prisma.topic.findUnique({
            where: { id: dto.topicId },
            include: { module: { select: { course_id: true } } },
          });

          if (!topic) {
            throw new NotFoundException(`Topic not found with ID ${dto.topicId}`);
          }

          if (!topic.is_free_trial) {
            const activeEntitlement = await this.prisma.entitlement.findFirst({
              where: {
                student_id: studentId,
                course_id: topic.module.course_id,
                status: EntitlementStatus.ACTIVE,
                expires_at: { gt: new Date() },
              },
              select: { id: true },
            });

            if (!activeEntitlement) {
              throw new ForbiddenException({
                errorCode: "CONTENT_LOCKED",
                message:
                  "This quiz chapter requires an active course entitlement",
              });
            }
          }

          totalQuestions = await this.prisma.question.count({
            where: { topic_id: dto.topicId, is_active: true },
          });
        } else {
          totalQuestions = 10;
        }

        durationMin = 20; // Default 20 minutes for quizzes
        serverDeadlineAt = new Date(
          serverStartedAt.getTime() + durationMin * 60 * 1000,
        );
        break;
      }

      case AttemptCategory.PRACTICE: {
        if (dto.topicId) {
          totalQuestions = await this.prisma.question.count({
            where: { topic_id: dto.topicId, is_active: true },
          });
        } else {
          totalQuestions = 10;
        }

        // Untimed practice mode
        durationMin = null;
        serverDeadlineAt = null;
        break;
      }

      default:
        throw new BadRequestException(`Unsupported category: ${dto.category}`);
    }

    const attempt = await this.prisma.attempt.create({
      data: {
        student_id: studentId,
        category: dto.category,
        exam_id: dto.examId ?? null,
        coc_set_id: dto.cocSetId ?? null,
        topic_id: dto.topicId ?? null,
        quiz_no: dto.quizNo ?? null,
        state: AttemptState.STARTED,
        total_questions: totalQuestions,
        server_started_at: serverStartedAt,
        server_deadline_at: serverDeadlineAt,
      },
    });

    this.logger.log(
      `Attempt ${attempt.id} started for student ${studentId} [category: ${attempt.category}, total: ${totalQuestions}]`,
    );

    return {
      id: attempt.id,
      category: attempt.category,
      state: attempt.state,
      totalQuestions: attempt.total_questions,
      serverStartedAt: attempt.server_started_at,
      serverDeadlineAt: attempt.server_deadline_at,
      durationMin,
    };
  }

  /**
   * Submit an attempt, run monotonic anti-cheat validation, grade answers via @mastara/domain, and persist scores.
   */
  async submitAttempt(
    studentId: string,
    attemptId: string,
    dto: SubmitAttemptDto,
  ): Promise<AttemptResultResponse> {
    const attempt = await this.prisma.attempt.findUnique({
      where: { id: attemptId },
      include: {
        exam: {
          select: { id: true, passing_score: true, course_id: true },
        },
        coc_set: {
          select: { id: true },
        },
      },
    });

    if (!attempt) {
      throw new NotFoundException(`Attempt not found with ID ${attemptId}`);
    }

    if (attempt.student_id !== studentId) {
      throw new ForbiddenException("You cannot submit an attempt that belongs to another student");
    }

    if (
      attempt.state === AttemptState.RESULT_AVAILABLE ||
      attempt.state === AttemptState.SUBMITTED
    ) {
      throw new ConflictException(
        "Attempt has already been submitted and finalized",
      );
    }

    const now = new Date();
    let isTampered = attempt.is_tampered;
    let integrityMetadata: any = attempt.integrity_metadata ?? null;

    // Server-Side Monotonic Anti-Cheat: Validate submission deadline
    if (attempt.server_deadline_at) {
      const deadlineWithGrace = new Date(
        attempt.server_deadline_at.getTime() + this.GRACE_PERIOD_MS,
      );
      if (now > deadlineWithGrace) {
        isTampered = true;
        const diffMs = now.getTime() - attempt.server_deadline_at.getTime();
        integrityMetadata = {
          reason: "EXCEEDED_SERVER_DEADLINE",
          submittedAt: now.toISOString(),
          deadlineAt: attempt.server_deadline_at.toISOString(),
          diffMs,
        };
        this.logger.warn(
          `Anti-Cheat Alert: Attempt ${attemptId} exceeded deadline by ${diffMs}ms`,
        );
      }
    }

    // Retrieve official questions for grading
    let questions: any[] = [];

    if (attempt.exam_id) {
      const examQuestions = await this.prisma.examQuestion.findMany({
        where: { exam_id: attempt.exam_id },
        include: { question: true },
        orderBy: { sort_order: "asc" },
      });
      questions = examQuestions.map((eq) => eq.question);
    } else if (attempt.coc_set_id) {
      const cocSetQuestions = await this.prisma.cocSetQuestion.findMany({
        where: { coc_set_id: attempt.coc_set_id },
        include: {
          coc_question: {
            include: { question: true },
          },
        },
        orderBy: { sort_order: "asc" },
      });
      questions = cocSetQuestions.map((csq) => csq.coc_question.question);
    } else if (attempt.topic_id) {
      questions = await this.prisma.question.findMany({
        where: { topic_id: attempt.topic_id, is_active: true },
        orderBy: { created_at: "asc" },
      });
    } else {
      // Fallback: Query submitted question IDs
      const questionIds = dto.answers.map((a) => a.questionId);
      questions = await this.prisma.question.findMany({
        where: { id: { in: questionIds } },
      });
    }

    // Map questions to ScorableQuestion for @mastara/domain grading
    const scorableQuestions: ScorableQuestion[] = questions.map((q) => {
      const isShort = q.type === QuestionType.SHORT_ANSWER;
      const correctAnswers = Array.isArray(q.correct_answers)
        ? (q.correct_answers as string[])
        : [String(q.correct_answers || "")];

      if (isShort) {
        return {
          id: q.id,
          courseId: q.course_id,
          type: "SHORT",
          acceptedAnswers: correctAnswers,
        };
      }

      let choiceType: "SINGLE" | "MULTIPLE" | "TRUE_FALSE" = "SINGLE";
      if (q.type === QuestionType.MULTIPLE_CHOICE) choiceType = "MULTIPLE";
      else if (q.type === QuestionType.TRUE_FALSE) choiceType = "TRUE_FALSE";

      return {
        id: q.id,
        courseId: q.course_id,
        type: choiceType,
        correctOptionIds: correctAnswers,
      };
    });

    // Map submitted answers
    const submittedAnswersMap = new Map<string, any>();
    for (const ans of dto.answers) {
      submittedAnswersMap.set(ans.questionId, ans);
    }

    const domainAnswersRecord: Record<string, Answer> = {};
    for (const q of questions) {
      const sub = submittedAnswersMap.get(q.id);
      if (sub && sub.selectedAnswers && sub.selectedAnswers.length > 0) {
        if (q.type === QuestionType.SHORT_ANSWER) {
          domainAnswersRecord[q.id] = {
            kind: "text",
            text: sub.selectedAnswers[0] || "",
          };
        } else {
          domainAnswersRecord[q.id] = {
            kind: "choice",
            optionIds: sub.selectedAnswers,
          };
        }
      }
    }

    // Grade overall exam via @mastara/domain scoreExam
    const examScore: ExamScore = scoreExam(scorableQuestions, domainAnswersRecord);

    // Grade individual questions and build AttemptAnswer records
    const attemptAnswerRecords: any[] = [];
    const reviewItems: AttemptAnswerReviewItem[] = [];

    for (const q of questions) {
      const sub = submittedAnswersMap.get(q.id);
      const domainAnswer = domainAnswersRecord[q.id];
      const scorable = scorableQuestions.find((sq) => sq.id === q.id)!;
      const isCorrect = domainAnswer
        ? gradeAnswer(scorable, domainAnswer)
        : false;

      attemptAnswerRecords.push({
        attempt_id: attemptId,
        question_id: q.id,
        selected_answers: sub ? sub.selectedAnswers : [],
        is_correct: isCorrect,
        is_flagged: sub?.isFlagged ?? false,
        client_timestamp: sub?.clientTimestamp
          ? new Date(sub.clientTimestamp)
          : now,
        server_timestamp: now,
      });

      reviewItems.push({
        questionId: q.id,
        courseId: q.course_id,
        type: q.type,
        prompt: {
          en: q.prompt_en,
          am: q.prompt_am || q.prompt_en,
        },
        explanation: q.explanation_en
          ? {
              en: q.explanation_en,
              am: q.explanation_am || q.explanation_en,
            }
          : undefined,
        options: q.options,
        correctAnswers: q.correct_answers,
        selectedAnswers: sub ? sub.selectedAnswers : [],
        isCorrect,
        isFlagged: sub?.isFlagged ?? false,
      });
    }

    const total = questions.length || attempt.total_questions || 1;
    const percentage = Number(((examScore.correct / total) * 100).toFixed(2));
    const passingScore = attempt.exam?.passing_score ?? 50;
    const isPassed = percentage >= passingScore;
    const elapsedMs = BigInt(
      dto.elapsedMs ??
        Math.max(0, now.getTime() - attempt.server_started_at.getTime()),
    );

    // Atomically persist answers and update Attempt record
    await this.prisma.$transaction(async (tx) => {
      await tx.attemptAnswer.deleteMany({
        where: { attempt_id: attemptId },
      });

      if (attemptAnswerRecords.length > 0) {
        await tx.attemptAnswer.createMany({
          data: attemptAnswerRecords,
        });
      }

      await tx.attempt.update({
        where: { id: attemptId },
        data: {
          state: AttemptState.RESULT_AVAILABLE,
          score: percentage,
          correct_count: examScore.correct,
          total_questions: total,
          elapsed_ms: elapsedMs,
          submitted_at: now,
          is_tampered: isTampered,
          integrity_metadata: integrityMetadata,
        },
      });
    });

    this.logger.log(
      `Attempt ${attemptId} graded: ${examScore.correct}/${total} (${percentage}%) [isPassed: ${isPassed}, isTampered: ${isTampered}]`,
    );

    return {
      attemptId: attempt.id,
      category: attempt.category,
      state: AttemptState.RESULT_AVAILABLE,
      score: percentage,
      correctCount: examScore.correct,
      totalQuestions: total,
      percentage,
      isPassed,
      passingScore,
      isTampered,
      integrityMetadata,
      elapsedMs: Number(elapsedMs),
      serverStartedAt: attempt.server_started_at,
      submittedAt: now,
      byCourse: examScore.byCourse,
      answers: reviewItems,
    };
  }

  /**
   * Get detailed results for an already-completed attempt.
   */
  async getAttemptResult(
    studentId: string,
    attemptId: string,
  ): Promise<AttemptResultResponse> {
    const attempt = await this.prisma.attempt.findUnique({
      where: { id: attemptId },
      include: {
        exam: {
          select: { id: true, passing_score: true },
        },
        answers: {
          include: {
            question: true,
          },
          orderBy: { server_timestamp: "asc" },
        },
      },
    });

    if (!attempt) {
      throw new NotFoundException(`Attempt not found with ID ${attemptId}`);
    }

    if (attempt.student_id !== studentId) {
      throw new ForbiddenException("You cannot view results for another student's attempt");
    }

    if (
      attempt.state !== AttemptState.RESULT_AVAILABLE &&
      attempt.state !== AttemptState.SUBMITTED
    ) {
      throw new BadRequestException("Results are not yet available for this attempt");
    }

    const passingScore = attempt.exam?.passing_score ?? 50;
    const score = attempt.score ?? 0;
    const isPassed = score >= passingScore;

    // Aggregate byCourse
    const byCourse: Record<string, ScoreLine> = {};
    const reviewItems: AttemptAnswerReviewItem[] = [];

    for (const ans of attempt.answers) {
      const q = ans.question;
      const isCorrect = ans.is_correct ?? false;

      if (q.course_id) {
        const line = byCourse[q.course_id] ?? { correct: 0, total: 0 };
        line.total += 1;
        if (isCorrect) line.correct += 1;
        byCourse[q.course_id] = line;
      }

      reviewItems.push({
        questionId: q.id,
        courseId: q.course_id,
        type: q.type,
        prompt: {
          en: q.prompt_en,
          am: q.prompt_am || q.prompt_en,
        },
        explanation: q.explanation_en
          ? {
              en: q.explanation_en,
              am: q.explanation_am || q.explanation_en,
            }
          : undefined,
        options: q.options,
        correctAnswers: q.correct_answers,
        selectedAnswers: Array.isArray(ans.selected_answers)
          ? (ans.selected_answers as string[])
          : [],
        isCorrect,
        isFlagged: ans.is_flagged,
      });
    }

    return {
      attemptId: attempt.id,
      category: attempt.category,
      state: attempt.state,
      score,
      correctCount: attempt.correct_count ?? 0,
      totalQuestions: attempt.total_questions,
      percentage: score,
      isPassed,
      passingScore,
      isTampered: attempt.is_tampered,
      integrityMetadata: attempt.integrity_metadata,
      elapsedMs: Number(attempt.elapsed_ms),
      serverStartedAt: attempt.server_started_at,
      submittedAt: attempt.submitted_at ?? attempt.updated_at,
      byCourse,
      answers: reviewItems,
    };
  }

  /**
   * List attempts for the authenticated student.
   */
  async getStudentAttempts(
    studentId: string,
    query: GetAttemptsQueryDto,
  ): Promise<PaginatedAttemptsResponse> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    const where: any = {
      student_id: studentId,
      ...(query.category ? { category: query.category } : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.attempt.findMany({
        where,
        orderBy: { created_at: "desc" },
        skip,
        take: limit,
        select: {
          id: true,
          category: true,
          state: true,
          score: true,
          correct_count: true,
          total_questions: true,
          is_tampered: true,
          server_started_at: true,
          server_deadline_at: true,
          submitted_at: true,
          created_at: true,
        },
      }),
      this.prisma.attempt.count({ where }),
    ]);

    return {
      items: items.map((a) => ({
        id: a.id,
        category: a.category,
        state: a.state,
        score: a.score,
        correctCount: a.correct_count,
        totalQuestions: a.total_questions,
        isTampered: a.is_tampered,
        serverStartedAt: a.server_started_at,
        serverDeadlineAt: a.server_deadline_at,
        submittedAt: a.submitted_at,
        createdAt: a.created_at,
      })),
      total,
      page,
      limit,
    };
  }
}
