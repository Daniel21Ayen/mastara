import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  Res,
  UseGuards,
  HttpStatus,
  ParseIntPipe,
  UseInterceptors,
  UploadedFile,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import type { Response } from "express";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
  ApiConsumes,
} from "@nestjs/swagger";

import { CurrentUser } from "../../../../common/decorators/current-user.decorator";
import { AdminTestsService } from "../services/admin-tests.service";

import {
  AdminQuestionInputDto,
  AdminQuizSettingsInputDto,
  AdminQuestionListQueryDto,
  AdminExamSetListQueryDto,
  AdminExamSetInputDto,
  AdminBulkQuestionImportDto,
} from "../dto";
import type {
  AdminQuestion,
  QuizSummary,
  TestsOverview,
  QuestionListResult,
  ExamSet,
  ExamSetListResult,
  BulkQuestionImportResult,
} from "@mastara/contracts";

import type { QuizNumber } from "@mastara/domain";

import { RequirePermission } from "../../../../common/decorators/require-permission.decorator";

@ApiTags("Admin Tests Management")
@ApiBearerAuth()
@RequirePermission("questions.write")
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

  @Delete("questions/:id")
  @ApiOperation({ summary: "Delete question and renumber subsequent questions in set" })
  @ApiParam({ name: "id", description: "UUID of the question" })
  @ApiResponse({ status: HttpStatus.OK, description: "Question deleted and set renumbered" })
  async deleteQuestion(
    @Param("id") id: string,
    @CurrentUser("id") adminId: string,
  ): Promise<{ success: boolean }> {
    return this.adminTestsService.deleteQuestion(id, adminId);
  }

  @Get("exam-sets")
  @ApiOperation({ summary: "List and search exam sets (Mid, Final, Mock, COC)" })
  @ApiResponse({ status: HttpStatus.OK, description: "Paginated exam sets list" })
  async listExamSets(
    @Query() query: AdminExamSetListQueryDto,
  ): Promise<ExamSetListResult> {
    return this.adminTestsService.listExamSets(query);
  }

  @Get("exam-sets/lookup/:id")
  @ApiOperation({ summary: "Check if exam set ID exists" })
  @ApiParam({ name: "id", description: "Exam Set ID or UUID" })
  @ApiResponse({ status: HttpStatus.OK, description: "Exam set details or null" })
  async findExamSet(@Param("id") id: string): Promise<ExamSet | null> {
    return this.adminTestsService.findExamSet(id);
  }

  @Get("exam-sets/question-owner/:questionId")
  @ApiOperation({ summary: "Find which exam set owns a given question ID" })
  @ApiParam({ name: "questionId", description: "Question ID" })
  @ApiResponse({ status: HttpStatus.OK, description: "Owner set ID or null" })
  async getQuestionOwner(
    @Param("questionId") questionId: string,
  ): Promise<{ ownerSetId: string | null }> {
    return this.adminTestsService.getQuestionOwner(questionId);
  }

  @Get("exam-sets/:id")
  @ApiOperation({ summary: "Get exam set details by ID" })
  @ApiParam({ name: "id", description: "Exam Set ID or UUID" })
  @ApiResponse({ status: HttpStatus.OK, description: "Exam set details" })
  async getExamSet(@Param("id") id: string): Promise<ExamSet> {
    return this.adminTestsService.getExamSet(id);
  }

  @Get("exam-sets/:id/export")
  @ApiOperation({
    summary:
      "Export exam set as downloadable CSV spreadsheet or printable HTML/PDF paper",
  })
  @ApiParam({ name: "id", description: "Exam Set ID (e.g. EXAM-SET-1041)" })
  @ApiQuery({
    name: "format",
    enum: ["csv", "pdf", "html"],
    required: false,
    description: "Export format (default: csv)",
  })
  @ApiQuery({
    name: "includeAnswers",
    type: Boolean,
    required: false,
    description:
      "Include teacher's answer key & solutions in output (default: true)",
  })
  @ApiQuery({
    name: "autoprint",
    type: Boolean,
    required: false,
    description:
      "Automatically trigger window.print() on load (for HTML/PDF format)",
  })
  async exportExamSet(
    @Param("id") id: string,
    @Res() res: Response,
    @Query("format") format: "csv" | "pdf" | "html" = "csv",
    @Query("includeAnswers") includeAnswers?: string,
    @Query("autoprint") autoprint?: string,
  ): Promise<void> {
    const withAnswers =
      includeAnswers === undefined || includeAnswers === "true";
    const auto = autoprint === "true";
    const result = await this.adminTestsService.exportExamSet(
      id,
      format,
      withAnswers,
      auto,
    );

    res.setHeader("Content-Type", result.contentType);
    if (format === "csv") {
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${result.filename}"`,
      );
    } else {
      res.setHeader(
        "Content-Disposition",
        `inline; filename="${result.filename}"`,
      );
    }

    res.send(result.content);
  }


  @Post("exam-sets")
  @ApiOperation({ summary: "Create or replace an exam set with all its questions" })
  @ApiResponse({ status: HttpStatus.OK, description: "Exam set created or updated" })
  async saveExamSet(
    @Body() dto: AdminExamSetInputDto,
    @CurrentUser("id") adminId: string,
  ): Promise<ExamSet> {
    return this.adminTestsService.saveExamSet(dto, adminId);
  }

  @Post("questions/bulk-import")
  @ApiOperation({
    summary: "Bulk import questions from CSV or JSON file upload or raw content",
  })
  @ApiConsumes("multipart/form-data", "application/json")
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Dry-run validation results or confirmed imported questions count",
  })
  @UseInterceptors(FileInterceptor("file"))
  async bulkImportQuestions(
    @Body() dto: AdminBulkQuestionImportDto,
    @CurrentUser("id") adminId: string,
    @UploadedFile() file?: Express.Multer.File,
  ): Promise<BulkQuestionImportResult> {
    return this.adminTestsService.bulkImportQuestions(dto, adminId, file);
  }

  @Get("questions/template.csv")
  @ApiOperation({ summary: "Download standard CSV questions import template" })
  @ApiResponse({ status: HttpStatus.OK, description: "Returns downloadable CSV template" })
  async downloadTemplate(@Res() res: Response): Promise<void> {
    const templateContent = this.adminTestsService.getTemplateCsv();
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", 'attachment; filename="mastara-questions-template.csv"');
    res.status(HttpStatus.OK).send(templateContent);
  }
}



