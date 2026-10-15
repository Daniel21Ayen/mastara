import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
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
  AttemptsService,
  StartAttemptResponse,
  AttemptResultResponse,
  PaginatedAttemptsResponse,
} from "../services/attempts.service";
import {
  StartAttemptDto,
  SubmitAttemptDto,
  GetAttemptsQueryDto,
} from "../dto";
import { CurrentUser } from "../../../../common/decorators/current-user.decorator";

@ApiTags("Assessment Attempts & Grading")
@ApiBearerAuth()
@Controller("assessment/attempts")
export class AttemptsController {
  constructor(private readonly attemptsService: AttemptsService) {}

  @Post("start")
  @ApiOperation({
    summary: "Start a new assessment attempt with server-side deadline calculation",
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: "Attempt started with server-authoritative timestamps and duration",
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: "Assessment ips locked and requires an active entitlement",
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: "Target exam, COC set, or topic not found",
  })
  async startAttempt(
    @CurrentUser("id") studentId: string,
    @Body() dto: StartAttemptDto,
  ): Promise<StartAttemptResponse> {
    return this.attemptsService.startAttempt(studentId, dto);
  }

  @Post(":id/submit")
  @ApiOperation({
    summary: "Submit attempt answers for server-side grading and anti-cheat validation",
  })
  @ApiParam({ name: "id", description: "UUID of the attempt" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Attempt graded successfully, returning scores and question review",
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: "Attempt has already been submitted and finalized",
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: "Attempt not found",
  })
  async submitAttempt(
    @CurrentUser("id") studentId: string,
    @Param("id", ParseUUIDPipe) attemptId: string,
    @Body() dto: SubmitAttemptDto,
  ): Promise<AttemptResultResponse> {
    return this.attemptsService.submitAttempt(studentId, attemptId, dto);
  }

  @Get(":id/result")
  @ApiOperation({
    summary: "Get detailed score breakdown and review for an already submitted attempt",
  })
  @ApiParam({ name: "id", description: "UUID of the attempt" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Comprehensive attempt results with per-course subscores and explanations",
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: "Attempt not found",
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: "Results not yet available",
  })
  async getAttemptResult(
    @CurrentUser("id") studentId: string,
    @Param("id", ParseUUIDPipe) attemptId: string,
  ): Promise<AttemptResultResponse> {
    return this.attemptsService.getAttemptResult(studentId, attemptId);
  }

  @Get()
  @ApiOperation({
    summary: "List assessment attempts for the authenticated student",
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Paginated list of student assessment attempts",
  })
  async getStudentAttempts(
    @CurrentUser("id") studentId: string,
    @Query() query: GetAttemptsQueryDto,
  ): Promise<PaginatedAttemptsResponse> {
    return this.attemptsService.getStudentAttempts(studentId, query);
  }
}
