import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Put,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import {
  StudentsService,
  StudentProfileResponse,
  UpdateCoursesResponse,
} from "../services/students.service";
import {
  UpdateAcademicScopeDto,
  UpdateCoursesDto,
  EditAccountDto,
} from "../dto";
import { CurrentUser } from "../../../../common/decorators/current-user.decorator";

@ApiTags("Student Profile")
@ApiBearerAuth()
@Controller("profile")
export class StudentsController {
  constructor(private readonly studentsService: StudentsService) {}

  @Get("me")
  @ApiOperation({ summary: "Get current student profile, academic scope, and active courses" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Student profile retrieved successfully",
  })
  async getProfile(
    @CurrentUser("id") studentId: string,
  ): Promise<StudentProfileResponse> {
    return this.studentsService.getProfile(studentId);
  }

  @Put("academic")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Set or update student academic scope (university, program, semester, stream)" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Academic scope updated successfully",
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: "Referenced university, program, or semester does not exist",
  })
  async updateAcademicScope(
    @CurrentUser("id") studentId: string,
    @Body() dto: UpdateAcademicScopeDto,
  ): Promise<StudentProfileResponse> {
    return this.studentsService.updateAcademicScope(studentId, dto);
  }

  @Put("courses")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Update active course enrollment selections" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Course enrollments updated successfully",
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: "One or more course IDs are invalid",
  })
  async updateCourses(
    @CurrentUser("id") studentId: string,
    @Body() dto: UpdateCoursesDto,
  ): Promise<UpdateCoursesResponse> {
    return this.studentsService.updateCourses(studentId, dto);
  }

  @Put("account")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Update student account display name or login identifier" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Account details updated successfully",
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: "Identifier is already in use by another student",
  })
  async updateAccount(
    @CurrentUser("id") studentId: string,
    @Body() dto: EditAccountDto,
  ): Promise<StudentProfileResponse> {
    return this.studentsService.updateAccount(studentId, dto);
  }

  @Post("me/request-deletion")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Student initiates 7-day account deletion process (SRS 3.2)" })
  async requestSelfDeletion(
    @CurrentUser("id") studentId: string,
    @Body() body?: { reason?: string },
  ) {
    return this.studentsService.requestStudentDeletion(studentId, body?.reason);
  }

  @Post("me/cancel-deletion")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Student cancels pending deletion within 7-day grace period" })
  async cancelSelfDeletion(@CurrentUser("id") studentId: string) {
    return this.studentsService.cancelStudentDeletion(studentId);
  }

  @Get("me/deletion-status")
  @ApiOperation({ summary: "Student views current 7-day deletion grace status" })
  async getSelfDeletionStatus(@CurrentUser("id") studentId: string) {
    return this.studentsService.getStudentDeletionStatus(studentId);
  }
}
