import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from "@nestjs/common";
import { PrismaService } from "../../../../infrastructure/database/prisma.service";
import {
  EntitlementStatus,
  QuestionType,
} from "@mastara/database";

export interface BilingualTextResponse {
  en: string;
  am: string;
}

export interface QuizChapterResponse {
  id: string;
  courseId: string;
  quizNo: number;
  chapterNumber: number;
  title: BilingualTextResponse;
  questionCount: number;
  minutes: number;
  isFree: boolean;
}

export interface QuestionOptionResponse {
  id: string;
  label: BilingualTextResponse;
}

export interface QuestionResponse {
  id: string;
  courseId?: string;
  prompt: BilingualTextResponse;
  explanation?: BilingualTextResponse;
  type: "SINGLE" | "TRUE_FALSE" | "MULTIPLE" | "SHORT";
  options?: QuestionOptionResponse[];
  correctOptionIds?: string[];
  acceptedAnswers?: string[];
}

@Injectable()
export class QuizzesService {
  private readonly logger = new Logger(QuizzesService.name);

  constructor(private readonly prisma: PrismaService) {}

  private mapQuestionType(
    dbType: QuestionType,
  ): "SINGLE" | "TRUE_FALSE" | "MULTIPLE" | "SHORT" {
    switch (dbType) {
      case QuestionType.SINGLE_CHOICE:
        return "SINGLE";
      case QuestionType.MULTIPLE_CHOICE:
        return "MULTIPLE";
      case QuestionType.TRUE_FALSE:
        return "TRUE_FALSE";
      case QuestionType.SHORT_ANSWER:
        return "SHORT";
      default:
        return "SINGLE";
    }
  }

  private mapQuestionToContract(q: any): QuestionResponse {
    const type = this.mapQuestionType(q.type);
    const prompt: BilingualTextResponse = {
      en: q.prompt_en,
      am: q.prompt_am || q.prompt_en,
    };

    const explanation: BilingualTextResponse | undefined = q.explanation_en
      ? {
          en: q.explanation_en,
          am: q.explanation_am || q.explanation_en,
        }
      : undefined;

    if (type === "SHORT") {
      const acceptedAnswers = Array.isArray(q.correct_answers)
        ? (q.correct_answers as string[])
        : [String(q.correct_answers || "")];

      return {
        id: q.id,
        courseId: q.course_id,
        type: "SHORT",
        prompt,
        explanation,
        acceptedAnswers,
      };
    }

    const rawOptions = Array.isArray(q.options) ? q.options : [];
    const options: QuestionOptionResponse[] = rawOptions.map(
      (opt: any, index: number) => {
        const id = opt.id || String(index + 1);
        let labelEn = "";
        let labelAm = "";

        if (typeof opt.label === "string") {
          labelEn = opt.label;
          labelAm = opt.label;
        } else if (opt.label && typeof opt.label === "object") {
          labelEn = opt.label.en || "";
          labelAm = opt.label.am || labelEn;
        } else {
          labelEn = opt.label_en || `Option ${id}`;
          labelAm = opt.label_am || labelEn;
        }

        return {
          id,
          label: {
            en: labelEn,
            am: labelAm,
          },
        };
      },
    );

    const correctOptionIds = Array.isArray(q.correct_answers)
      ? (q.correct_answers as string[])
      : [String(q.correct_answers || "")];

    return {
      id: q.id,
      courseId: q.course_id,
      type,
      prompt,
      explanation,
      options,
      correctOptionIds,
    };
  }

  async getCourseQuizChapters(
    courseId: string,
    quizNo: number,
  ): Promise<QuizChapterResponse[]> {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      select: { id: true },
    });

    if (!course) {
      throw new NotFoundException(`Course not found with ID ${courseId}`);
    }

    const quizChapters = await this.prisma.quizChapter.findMany({
      where: {
        course_id: courseId,
        quiz_no: quizNo,
      },
      orderBy: { chapter_number: "asc" },
      include: {
        topic: {
          select: {
            id: true,
            title_en: true,
            title_am: true,
            is_free_trial: true,
          },
        },
      },
    });

    const result: QuizChapterResponse[] = [];

    for (const qc of quizChapters) {
      const questionCount = await this.prisma.question.count({
        where: {
          course_id: courseId,
          ...(qc.topic_id ? { topic_id: qc.topic_id } : {}),
          is_active: true,
        },
      });

      const isFree =
        qc.is_free_trial || (qc.topic ? qc.topic.is_free_trial : false);

      result.push({
        id: qc.id,
        courseId: qc.course_id,
        quizNo: qc.quiz_no,
        chapterNumber: qc.chapter_number,
        title: {
          en: qc.topic?.title_en || `Chapter ${qc.chapter_number}`,
          am: qc.topic?.title_am || `ምዕራፍ ${qc.chapter_number}`,
        },
        questionCount,
        minutes: Math.max(5, questionCount * 2),
        isFree,
      });
    }

    return result;
  }

  async getChapterById(chapterId: string): Promise<QuizChapterResponse> {
    const qc = await this.prisma.quizChapter.findUnique({
      where: { id: chapterId },
      include: {
        topic: {
          select: {
            id: true,
            title_en: true,
            title_am: true,
            is_free_trial: true,
          },
        },
      },
    });

    if (!qc) {
      throw new NotFoundException(`Quiz chapter not found with ID ${chapterId}`);
    }

    const questionCount = await this.prisma.question.count({
      where: {
        course_id: qc.course_id,
        ...(qc.topic_id ? { topic_id: qc.topic_id } : {}),
        is_active: true,
      },
    });

    const isFree =
      qc.is_free_trial || (qc.topic ? qc.topic.is_free_trial : false);

    return {
      id: qc.id,
      courseId: qc.course_id,
      quizNo: qc.quiz_no,
      chapterNumber: qc.chapter_number,
      title: {
        en: qc.topic?.title_en || `Chapter ${qc.chapter_number}`,
        am: qc.topic?.title_am || `ምዕራፍ ${qc.chapter_number}`,
      },
      questionCount,
      minutes: Math.max(5, questionCount * 2),
      isFree,
    };
  }

  async getChapterQuestions(
    studentId: string,
    chapterId: string,
  ): Promise<QuestionResponse[]> {
    const qc = await this.prisma.quizChapter.findUnique({
      where: { id: chapterId },
      include: {
        topic: {
          select: {
            id: true,
            is_free_trial: true,
          },
        },
      },
    });

    if (!qc) {
      throw new NotFoundException(`Quiz chapter not found with ID ${chapterId}`);
    }

    const isFree =
      qc.is_free_trial || (qc.topic ? qc.topic.is_free_trial : false);

    if (!isFree) {
      const activeEntitlement = await this.prisma.entitlement.findFirst({
        where: {
          student_id: studentId,
          course_id: qc.course_id,
          status: EntitlementStatus.ACTIVE,
          expires_at: { gt: new Date() },
        },
        select: { id: true },
      });

      if (!activeEntitlement) {
        throw new ForbiddenException({
          errorCode: "CONTENT_LOCKED",
          message: "This quiz chapter requires an active course subscription",
        });
      }
    }

    const questions = await this.prisma.question.findMany({
      where: {
        course_id: qc.course_id,
        ...(qc.topic_id ? { topic_id: qc.topic_id } : {}),
        is_active: true,
      },
      orderBy: { created_at: "asc" },
    });

    return questions.map((q) => this.mapQuestionToContract(q));
  }
}
