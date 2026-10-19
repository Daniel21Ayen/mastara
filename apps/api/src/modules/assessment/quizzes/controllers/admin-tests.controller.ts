import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Body,
  Query,
  UseGuards,
  HttpStatus,
  ParseIntPipe,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from "@nestjs/swagger";
import { Role } from "@mastara/database";
import { RolesGuard } from "../../../../common/guards/roles.guard";
import { Roles } from "../../../../common/decorators/roles.decorator";
import { CurrentUser } from "../../../../common/decorators/current-user.decorator";
import { AdminTestsService } from "../services/admin-tests.service";

import {
  AdminQuestionInputDto,
  AdminQuizSettingsInputDto,
  AdminQuestionListQueryDto,
} from "../dto/admin-tests.dto";
import type {
  AdminQuestion,
  QuizSummary,
  TestsOverview,
  QuestionListResult,
} from "@mastara/contracts";
import type { QuizNumber } from "@mastara/domain";

@ApiTags("Admin Tests Management")
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Roles(Role.ADMIN)
@Controller("assessment/admin")
export class AdminTestsController {
  constructor(private readonly adminTestsService: AdminTestsService) {}

  @Get("courses/:courseId/tests-overview")
  @ApiOperation({
    summary: "Get tests overview (quizzes 1, 2, 3 and recent question edits) for a course",
  })
  @ApiParam({ name: "courseId", description: "UUID of the course" })
  @ApiResponse({ status: HttpStatus.OK, description: "Tests overview" })
  async getOverview(
    @Param("courseId") courseId: string,
  ): Promise<TestsOverview> {
    return this.adminTestsService.getOverview(courseId);
  }

  @Put("courses/:courseId/quizzes/:quizNo")
  @ApiOperation({
    summary: "Update quiz settings (duration minutes, publication status)",
  })
  @ApiParam({ name: "courseId", description: "UUID of the course" })
  @ApiParam({ name: "quizNo", description: "Quiz number (1, 2, or 3)" })
  @ApiResponse({ status: HttpStatus.OK, description: "Updated quiz summary" })
  async updateQuiz(
    @Param("courseId") courseId: string,
    @Param("quizNo", ParseIntPipe) quizNo: number,
    @Body() dto: AdminQuizSettingsInputDto,
    @CurrentUser("id") adminId: string,
  ): Promise<QuizSummary> {
    return this.adminTestsService.updateQuiz(
      courseId,
      quizNo as QuizNumber,
      dto,
      adminId,
    );
  }

  @Get("questions")
  @ApiOperation({ summary: "List and search questions in the question bank" })
  @ApiResponse({ status: HttpStatus.OK, description: "Paginated questions list" })
  async listQuestions(
    @Query() query: AdminQuestionListQueryDto,
  ): Promise<QuestionListResult> {
    return this.adminTestsService.listQuestions(query);
  }

  @Get("questions/:id")
  @ApiOperation({ summary: "Get question details by ID" })
  @ApiParam({ name: "id", description: "UUID of the question" })
  @ApiResponse({ status: HttpStatus.OK, description: "Question details" })
  async getQuestion(@Param("id") id: string): Promise<AdminQuestion> {
    return this.adminTestsService.getQuestion(id);
  }

  @Post("questions")
  @ApiOperation({ summary: "Create a new question in the question bank" })
  @ApiResponse({ status: HttpStatus.CREATED, description: "Question created" })
  async createQuestion(
    @Body() dto: AdminQuestionInputDto,
    @CurrentUser("id") adminId: string,
  ): Promise<AdminQuestion> {
    return this.adminTestsService.createQuestion(dto, adminId);
  }

  @Put("questions/:id")
  @ApiOperation({
    summary: "Update an existing question in the question bank",
  })
  @ApiParam({ name: "id", description: "UUID of the question" })
  @ApiResponse({ status: HttpStatus.OK, description: "Question updated" })
  async updateQuestion(
    @Param("id") id: string,
    @Body() dto: AdminQuestionInputDto,
    @CurrentUser("id") adminId: string,
  ): Promise<AdminQuestion> {
    return this.adminTestsService.updateQuestion(id, dto, adminId);
  }
}
