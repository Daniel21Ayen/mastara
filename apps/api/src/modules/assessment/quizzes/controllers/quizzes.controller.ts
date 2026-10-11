import {
  Controller,
  Get,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Query,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import {
  QuizzesService,
  QuizChapterResponse,
  QuestionResponse,
} from "../services/quizzes.service";
import { GetQuizChaptersQueryDto } from "../dto/get-quiz-chapters-query.dto";
import { CurrentUser } from "../../../../common/decorators/current-user.decorator";

@ApiTags("Quizzes & Chapter Practice")
@ApiBearerAuth()
@Controller("assessment/quizzes")
export class QuizzesController {
  constructor(private readonly quizzesService: QuizzesService) {}

  @Get("courses/:courseId/chapters")
  @ApiOperation({
    summary: "List practice chapters for a course under Quiz 1, 2, or 3",
  })
  @ApiParam({ name: "courseId", description: "UUID of the course" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "List of quiz chapters with question counts and time estimates",
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: "Course not found" })
  async getCourseQuizChapters(
    @Param("courseId", ParseUUIDPipe) courseId: string,
    @Query() query: GetQuizChaptersQueryDto,
  ): Promise<QuizChapterResponse[]> {
    return this.quizzesService.getCourseQuizChapters(courseId, query.quizNo);
  }

  @Get("chapters/:chapterId")
  @ApiOperation({ summary: "Get metadata for a specific quiz chapter" })
  @ApiParam({ name: "chapterId", description: "UUID of the quiz chapter" })
  @ApiResponse({ status: HttpStatus.OK, description: "Quiz chapter metadata" })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: "Quiz chapter not found" })
  async getChapterById(
    @Param("chapterId", ParseUUIDPipe) chapterId: string,
  ): Promise<QuizChapterResponse> {
    return this.quizzesService.getChapterById(chapterId);
  }

  @Get("chapters/:chapterId/questions")
  @ApiOperation({
    summary: "Get practice questions for a quiz chapter with free-trial verification",
  })
  @ApiParam({ name: "chapterId", description: "UUID of the quiz chapter" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "List of questions for chapter practice",
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: "Chapter is locked and requires an active course entitlement",
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: "Quiz chapter not found" })
  async getChapterQuestions(
    @CurrentUser("id") studentId: string,
    @Param("chapterId", ParseUUIDPipe) chapterId: string,
  ): Promise<QuestionResponse[]> {
    return this.quizzesService.getChapterQuestions(studentId, chapterId);
  }
}
