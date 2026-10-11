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
  ExamsService,
  ExamListingResponse,
  ExamSessionResponse,
} from "../services/exams.service";
import { GetExamsQueryDto } from "../dto/get-exams-query.dto";
import { CurrentUser } from "../../../../common/decorators/current-user.decorator";

@ApiTags("Exams Management")
@ApiBearerAuth()
@Controller("assessment/exams")
export class ExamsController {
  constructor(private readonly examsService: ExamsService) {}

  @Get("courses/:courseId")
  @ApiOperation({
    summary: "List past university exams for a course (optionally filtered by kind)",
  })
  @ApiParam({ name: "courseId", description: "UUID of the course" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "List of course exams with university metadata",
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: "Course not found" })
  async getCourseExams(
    @Param("courseId", ParseUUIDPipe) courseId: string,
    @Query() query: GetExamsQueryDto,
  ): Promise<ExamListingResponse[]> {
    return this.examsService.getCourseExams(courseId, query.kind);
  }

  @Get(":examId/session")
  @ApiOperation({
    summary: "Get full exam session payload and questions for taking an exam",
  })
  @ApiParam({ name: "examId", description: "UUID of the exam" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Exam metadata, university metadata, and sorted question items",
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: "Exam is locked and requires an active course entitlement",
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: "Exam not found" })
  async getExamSession(
    @CurrentUser("id") studentId: string,
    @Param("examId", ParseUUIDPipe) examId: string,
  ): Promise<ExamSessionResponse> {
    return this.examsService.getExamSession(studentId, examId);
  }
}
