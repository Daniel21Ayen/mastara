import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
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
import { Roles } from "../../../common/decorators/roles.decorator";
import { RolesGuard } from "../../../common/guards/roles.guard";
import { CurrentUser } from "../../../common/decorators/current-user.decorator";
import { CatalogService } from "../services/catalog.service";
import {
  AdminCourseDto,
  AdminProgramDto,
  AdminSemesterDto,
  AdminUniversityDto,
  CourseListQueryDto,
  CourseListResultDto,
  CreateCourseDto,
  ProgramInputDto,
  SemesterStatusDto,
  UniversityInputDto,
  UpdateCourseDto,
} from "../dto";

import { PaginationQueryDto } from "../../../common/pagination";

@ApiTags("Admin: Academic Catalog")
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Roles(Role.ADMIN)
@Controller("catalog/admin")
export class AdminCatalogController {
  constructor(private readonly catalogService: CatalogService) {}

  // ---- Universities ----

  @Get("universities")
  @ApiOperation({ summary: "List all universities for admin catalog with optional pagination" })
  @ApiResponse({ status: HttpStatus.OK, type: [AdminUniversityDto] })
  async listUniversities(@Query() query?: PaginationQueryDto) {
    return this.catalogService.listAdminUniversities(query);
  }

  @Post("universities")
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Create a new university" })
  @ApiResponse({ status: HttpStatus.CREATED, type: AdminUniversityDto })
  async createUniversity(
    @CurrentUser("id") adminId: string,
    @Body() dto: UniversityInputDto,
  ): Promise<AdminUniversityDto> {
    return this.catalogService.createAdminUniversity(adminId, dto);
  }

  @Put("universities/:id")
  @ApiOperation({ summary: "Update university details or publish status" })
  @ApiParam({ name: "id", description: "University UUID" })
  @ApiResponse({ status: HttpStatus.OK, type: AdminUniversityDto })
  async updateUniversity(
    @CurrentUser("id") adminId: string,
    @Param("id") id: string,
    @Body() dto: UniversityInputDto,
  ): Promise<AdminUniversityDto> {
    return this.catalogService.updateAdminUniversity(adminId, id, dto);
  }

  @Delete("universities/:id")
  @ApiOperation({ summary: "Delete an unused university" })
  @ApiParam({ name: "id", description: "University UUID" })
  @ApiResponse({ status: HttpStatus.OK, type: AdminUniversityDto })
  async deleteUniversity(
    @CurrentUser("id") adminId: string,
    @Param("id") id: string,
  ): Promise<AdminUniversityDto> {
    return this.catalogService.deleteAdminUniversity(adminId, id);
  }

  // ---- Programs ----

  @Get("programs")
  @ApiOperation({ summary: "List all programs for admin catalog with optional pagination" })
  @ApiResponse({ status: HttpStatus.OK, type: [AdminProgramDto] })
  async listPrograms(@Query() query?: PaginationQueryDto) {
    return this.catalogService.listAdminPrograms(query);
  }

  @Post("programs")
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Create a new program and generate its freshman semesters" })
  @ApiResponse({ status: HttpStatus.CREATED, type: AdminProgramDto })
  async createProgram(
    @CurrentUser("id") adminId: string,
    @Body() dto: ProgramInputDto,
  ): Promise<AdminProgramDto> {
    return this.catalogService.createAdminProgram(adminId, dto);
  }

  @Put("programs/:id")
  @ApiOperation({ summary: "Update program name or publish status" })
  @ApiParam({ name: "id", description: "Program UUID" })
  @ApiResponse({ status: HttpStatus.OK, type: AdminProgramDto })
  async updateProgram(
    @CurrentUser("id") adminId: string,
    @Param("id") id: string,
    @Body() dto: ProgramInputDto,
  ): Promise<AdminProgramDto> {
    return this.catalogService.updateAdminProgram(adminId, id, dto);
  }

  @Delete("programs/:id")
  @ApiOperation({ summary: "Delete an unused program" })
  @ApiParam({ name: "id", description: "Program UUID" })
  @ApiResponse({ status: HttpStatus.OK, type: AdminProgramDto })
  async deleteProgram(
    @CurrentUser("id") adminId: string,
    @Param("id") id: string,
  ): Promise<AdminProgramDto> {
    return this.catalogService.deleteAdminProgram(adminId, id);
  }

  // ---- Semesters ----

  @Get("semesters")
  @ApiOperation({ summary: "List all semesters for admin catalog with optional pagination" })
  @ApiResponse({ status: HttpStatus.OK, type: [AdminSemesterDto] })
  async listSemesters(@Query() query?: PaginationQueryDto) {
    return this.catalogService.listAdminSemesters(query);
  }

  @Put("semesters/:id")
  @ApiOperation({ summary: "Update semester publish status" })
  @ApiParam({ name: "id", description: "Semester UUID" })
  @ApiResponse({ status: HttpStatus.OK, type: AdminSemesterDto })
  async updateSemester(
    @CurrentUser("id") adminId: string,
    @Param("id") id: string,
    @Body() dto: SemesterStatusDto,
  ): Promise<AdminSemesterDto> {
    return this.catalogService.updateAdminSemester(adminId, id, dto);
  }

  @Delete("semesters/:id")
  @ApiOperation({ summary: "Delete an unused semester" })
  @ApiParam({ name: "id", description: "Semester UUID" })
  @ApiResponse({ status: HttpStatus.OK, type: AdminSemesterDto })
  async deleteSemester(
    @CurrentUser("id") adminId: string,
    @Param("id") id: string,
  ): Promise<AdminSemesterDto> {
    return this.catalogService.deleteAdminSemester(adminId, id);
  }

  // ---- Courses ----

  @Get("courses")
  @ApiOperation({ summary: "List courses with search, filters and pagination" })
  @ApiResponse({ status: HttpStatus.OK, type: CourseListResultDto })
  async listCourses(@Query() query: CourseListQueryDto): Promise<CourseListResultDto> {
    return this.catalogService.listAdminCourses(query);
  }

  @Post("courses")
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Create a new catalog course" })
  @ApiResponse({ status: HttpStatus.CREATED, type: AdminCourseDto })
  async createCourse(
    @CurrentUser("id") adminId: string,
    @Body() dto: CreateCourseDto,
  ): Promise<AdminCourseDto> {
    return this.catalogService.createAdminCourse(adminId, dto);
  }

  @Put("courses/:id")
  @ApiOperation({ summary: "Update course metadata, trial items or publish status" })
  @ApiParam({ name: "id", description: "Course UUID" })
  @ApiResponse({ status: HttpStatus.OK, type: AdminCourseDto })
  async updateCourse(
    @CurrentUser("id") adminId: string,
    @Param("id") id: string,
    @Body() dto: UpdateCourseDto,
  ): Promise<AdminCourseDto> {
    return this.catalogService.updateAdminCourse(adminId, id, dto);
  }

  @Delete("courses/:id")
  @ApiOperation({ summary: "Delete an unused course" })
  @ApiParam({ name: "id", description: "Course UUID" })
  @ApiResponse({ status: HttpStatus.OK, type: AdminCourseDto })
  async deleteCourse(
    @CurrentUser("id") adminId: string,
    @Param("id") id: string,
  ): Promise<AdminCourseDto> {
    return this.catalogService.deleteAdminCourse(adminId, id);
  }
}
