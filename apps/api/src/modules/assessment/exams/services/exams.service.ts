import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from "@nestjs/common";
import { PrismaService } from "../../../../infrastructure/database/prisma.service";
import {
  EntitlementStatus,
  ExamKind,
  PublicationStatus,
} from "@mastara/database";
import {
  mapQuestionToContract,
  QuestionResponse,
} from "../../common/question-mapper";

export interface ExamMetaResponse {
  id: string;
  courseId: string;
  universityId: string;
  kind: ExamKind;
  titleEn: string;
  titleAm: string | null;
  year: number | null;
  questionCount: number;
  minutes: number;
  isFree: boolean;
}

export interface UniversityMetaResponse {
  id: string;
  name: string;
  shortName: string;
  code: string;
}

export interface ExamListingResponse {
  exam: ExamMetaResponse;
  university: UniversityMetaResponse;
}

export interface ExamSessionResponse {
  exam: ExamMetaResponse;
  university: UniversityMetaResponse;
  questions: QuestionResponse[];
}

@Injectable()
export class ExamsService {
  private readonly logger = new Logger(ExamsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getCourseExams(
    courseId: string,
    kind?: ExamKind,
  ): Promise<ExamListingResponse[]> {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      select: { id: true },
    });

    if (!course) {
      throw new NotFoundException(`Course not found with ID ${courseId}`);
    }

    const exams = await this.prisma.exam.findMany({
      where: {
        course_id: courseId,
        status: PublicationStatus.PUBLISHED,
        ...(kind ? { kind } : {}),
      },
      include: {
        university: {
          select: {
            id: true,
            code: true,
            name_en: true,
          },
        },
        exam_questions: {
          select: { id: true },
        },
      },
      orderBy: { created_at: "desc" },
    });

    return exams.map((e) => ({
      exam: {
        id: e.id,
        courseId: e.course_id,
        universityId: e.university_id || "",
        kind: e.kind,
        titleEn: e.title_en,
        titleAm: e.title_am,
        year: e.year,
        questionCount: e.exam_questions.length,
        minutes: e.duration_min,
        isFree: e.is_free_trial,
      },
      university: {
        id: e.university?.id || "",
        name: e.university?.name_en || "",
        shortName: e.university?.code || "",
        code: e.university?.code || "",
      },
    }));
  }

  async getExamSession(
    studentId: string,
    examId: string,
  ): Promise<ExamSessionResponse> {
    const exam = await this.prisma.exam.findUnique({
      where: { id: examId },
      include: {
        university: {
          select: {
            id: true,
            code: true,
            name_en: true,
          },
        },
        exam_questions: {
          orderBy: { sort_order: "asc" },
          include: {
            question: true,
          },
        },
      },
    });

    if (!exam) {
      throw new NotFoundException(`Exam not found with ID ${examId}`);
    }

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
          message: "This exam requires an active course entitlement or subscription",
        });
      }
    }

    const questions: QuestionResponse[] = exam.exam_questions.map((eq) =>
      mapQuestionToContract(eq.question),
    );

    return {
      exam: {
        id: exam.id,
        courseId: exam.course_id,
        universityId: exam.university_id || "",
        kind: exam.kind,
        titleEn: exam.title_en,
        titleAm: exam.title_am,
        year: exam.year,
        questionCount: questions.length,
        minutes: exam.duration_min,
        isFree: exam.is_free_trial,
      },
      university: {
        id: exam.university?.id || "",
        name: exam.university?.name_en || "",
        shortName: exam.university?.code || "",
        code: exam.university?.code || "",
      },
      questions,
    };
  }
}
