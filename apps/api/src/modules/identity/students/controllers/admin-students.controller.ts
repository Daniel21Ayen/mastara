import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { Role } from "@mastara/database";
import { Roles } from "../../../../common/decorators/roles.decorator";
import { RolesGuard } from "../../../../common/guards/roles.guard";
import { CurrentUser } from "../../../../common/decorators/current-user.decorator";
import { StudentsService } from "../services/students.service";
import {
  AdminStudentDetailDto,
  CreateStudentDto,
  GrantAccessDto,
  StudentActionDto,
  StudentListQueryDto,
  StudentListResultDto,
  StudentOptionsDto,
} from "../dto";

@ApiTags("Admin: Students")
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Roles(Role.ADMIN)
@Controller("identity/students")
export class AdminStudentsController {
  constructor(private readonly studentsService: StudentsService) {}

  @Get()
  @ApiOperation({ summary: "List students with search, filters and pagination" })
  @ApiResponse({ status: HttpStatus.OK, type: StudentListResultDto })
  async listStudents(@Query() query: StudentListQueryDto): Promise<StudentListResultDto> {
    return this.studentsService.listAdminStudents(query);
  }

  @Get("options")
  @ApiOperation({ summary: "Get published universities, programs and semesters for student filters and creation" })
  @ApiResponse({ status: HttpStatus.OK, type: StudentOptionsDto })
  async getOptions(): Promise<StudentOptionsDto> {
    return this.studentsService.getStudentOptions();
  }

  @Get(":id")
  @ApiOperation({ summary: "Get detailed student profile with enrolled courses, device and access state" })
  @ApiParam({ name: "id", description: "Student UUID" })
  @ApiResponse({ status: HttpStatus.OK, type: AdminStudentDetailDto })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: "Student not found" })
  async getStudent(@Param("id") id: string): Promise<AdminStudentDetailDto> {
    return this.studentsService.getAdminStudentById(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Add a new student account" })
  @ApiResponse({ status: HttpStatus.CREATED, type: AdminStudentDetailDto })
  @ApiResponse({ status: HttpStatus.CONFLICT, description: "Identifier duplicate" })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: "Invalid academic hierarchy" })
  async createStudent(
    @CurrentUser("id") adminId: string,
    @Body() dto: CreateStudentDto,
  ): Promise<AdminStudentDetailDto> {
    return this.studentsService.createAdminStudent(adminId, dto);
  }

  @Post(":id/suspend")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Suspend an active student account" })
  @ApiParam({ name: "id", description: "Student UUID" })
  @ApiResponse({ status: HttpStatus.OK, type: AdminStudentDetailDto })
  @ApiResponse({ status: HttpStatus.CONFLICT, description: "Student already suspended" })
  async suspendStudent(
    @CurrentUser("id") adminId: string,
    @Param("id") id: string,
    @Body() dto: StudentActionDto,
  ): Promise<AdminStudentDetailDto> {
    return this.studentsService.suspendStudent(adminId, id, dto.reason);
  }

  @Post(":id/reactivate")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Reactivate a suspended student account" })
  @ApiParam({ name: "id", description: "Student UUID" })
  @ApiResponse({ status: HttpStatus.OK, type: AdminStudentDetailDto })
  @ApiResponse({ status: HttpStatus.CONFLICT, description: "Student already active" })
  async reactivateStudent(
    @CurrentUser("id") adminId: string,
    @Param("id") id: string,
    @Body() dto: StudentActionDto,
  ): Promise<AdminStudentDetailDto> {
    return this.studentsService.reactivateStudent(adminId, id, dto.reason);
  }

  @Post(":id/revoke-device")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Revoke student bound device" })
  @ApiParam({ name: "id", description: "Student UUID" })
  @ApiResponse({ status: HttpStatus.OK, type: AdminStudentDetailDto })
  @ApiResponse({ status: HttpStatus.CONFLICT, description: "Student has no bound device" })
  async revokeDevice(
    @CurrentUser("id") adminId: string,
    @Param("id") id: string,
    @Body() dto: StudentActionDto,
  ): Promise<AdminStudentDetailDto> {
    return this.studentsService.revokeStudentDevice(adminId, id, dto.reason);
  }

  @Post(":id/grant-access")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Grant or extend course access days for a student" })
  @ApiParam({ name: "id", description: "Student UUID" })
  @ApiResponse({ status: HttpStatus.OK, type: AdminStudentDetailDto })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: "Course not found" })
  async grantAccess(
    @CurrentUser("id") adminId: string,
    @Param("id") id: string,
    @Body() dto: GrantAccessDto,
  ): Promise<AdminStudentDetailDto> {
    return this.studentsService.grantStudentAccess(adminId, id, dto.courseId, dto.days, dto.reason);
  }
}
