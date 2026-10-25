import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  Logger,
} from "@nestjs/common";
import { PrismaService } from "../../../../infrastructure/database/prisma.service";
import { PublicationStatus, EntitlementStatus } from "@mastara/database";
import {
  BilingualTextResponse,
  mapQuestionToContract,
  QuestionResponse,
} from "../../common/question-mapper";

export interface CocSetResponse {
  id: string;
  number: number;
  title: BilingualTextResponse;
  questionCount: number;
  courseCount: number;
  minutes: number;
  isFree: boolean;
}

export interface CocSessionResponse {
  set: CocSetResponse;
  questions: QuestionResponse[];
  courseTitles: Record<string, string>;
}

@Injectable()
export class CocService {
  private readonly logger = new Logger(CocService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getCocSets(): Promise<CocSetResponse[]> {
    const sets = await this.prisma.cocSet.findMany({
      where: { status: PublicationStatus.PUBLISHED },
      include: {
        coc_set_questions: {
          include: {
            coc_question: {
              select: { course_id: true, is_free_trial: true },
            },
          },
        },
      },
      orderBy: { created_at: "asc" },
    });

    return sets.map((s, index) => {
      const courseIdSet = new Set(
        s.coc_set_questions.map((csq) => csq.coc_question.course_id),
      );

      const hasSampleQuestions = s.coc_set_questions.some(
        (csq) => csq.is_sample || csq.coc_question.is_free_trial,
      );

      return {
        id: s.id,
        number: index + 1,
        title: {
          en: s.title_en,
          am: s.title_am || s.title_en,
        },
        questionCount: s.coc_set_questions.length,
        courseCount: courseIdSet.size,
        minutes: s.duration_min,
        isFree: hasSampleQuestions,
      };
    });
  }

  async getCocSession(
    studentId: string,
    setId: string,
  ): Promise<CocSessionResponse> {
    const set = await this.prisma.cocSet.findUnique({
      where: { id: setId },
      include: {
        coc_set_questions: {
          orderBy: { sort_order: "asc" },
          include: {
            coc_question: {
              include: {
                question: true,
                course: {
                  select: { id: true, title_en: true },
                },
              },
            },
          },
        },
      },
    });

    if (!set) {
      throw new NotFoundException(`COC set not found with ID ${setId}`);
    }

    const activeEntitlement = await this.prisma.entitlement.findFirst({
      where: {
        student_id: studentId,
        status: EntitlementStatus.ACTIVE,
        expires_at: { gt: new Date() },
      },
      select: { id: true },
    });

    const sampleQuestions = set.coc_set_questions.filter((q) => q.is_sample);
    if (!activeEntitlement && sampleQuestions.length === 0) {
      throw new ForbiddenException({
        errorCode: "CONTENT_LOCKED",
        message: "This COC set requires an active subscription or entitlement",
      });
    }

    const targetQuestions = activeEntitlement
      ? set.coc_set_questions
      : sampleQuestions;

    const courseTitles: Record<string, string> = {};
    const questions: QuestionResponse[] = [];

    for (const csq of targetQuestions) {
      const cocQ = csq.coc_question;
      if (cocQ.course) {
        courseTitles[cocQ.course.id] = cocQ.course.title_en;
      }

      const q = mapQuestionToContract(cocQ.question);
      q.courseId = cocQ.course_id;
      questions.push(q);
    }

    const courseIdSet = new Set(Object.keys(courseTitles));

    return {
      set: {
        id: set.id,
        number: 1,
        title: {
          en: set.title_en,
          am: set.title_am || set.title_en,
        },
        questionCount: questions.length,
        courseCount: courseIdSet.size,
        minutes: set.duration_min,
        isFree: set.coc_set_questions.some((q) => q.is_sample),
      },
      questions,
      courseTitles,
    };
  }
}
