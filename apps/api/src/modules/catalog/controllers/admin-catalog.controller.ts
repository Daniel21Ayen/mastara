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
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { RequirePermission } from "../../../common/decorators/require-permission.decorator";
import { CurrentUser } from "../../../common/decorators/current-user.decorator";
import { ScopeService } from "../../../common/services/scope.service";
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
@Controller("catalog/admin")
export class AdminCatalogController {
  constructor(
    private readonly catalogService: CatalogService,
    private readonly scopeService: ScopeService,
  ) {}

  // ---- Universities ----

  @Get("universities")
  @RequirePermission("catalog.read")
  @ApiOperation({ summary: "List all universities for admin catalog with optional pagination" })
  @ApiResponse({ status: HttpStatus.OK, type: [AdminUniversityDto] })
  async listUniversities(@Query() query?: PaginationQueryDto) {
    return this.catalogService.listAdminUniversities(query);
  }

  @Post("universities")
  @RequirePermission("catalog.write")
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Create a new university (Super Admin only)" })
  @ApiResponse({ status: HttpStatus.CREATED, type: AdminUniversityDto })
  async createUniversity(
    @CurrentUser("id") adminId: string,
    @Body() dto: UniversityInputDto,
  ): Promise<AdminUniversityDto> {
    return this.catalogService.createAdminUniversity(adminId, dto);
  }

  @Put("universities/:id")
  @RequirePermission("catalog.write")
  @ApiOperation({ summary: "Update university details or publish status (Super Admin only)" })
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
  @RequirePermission("catalog.write")
  @ApiOperation({ summary: "Delete an unused university (Super Admin only)" })
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
  @RequirePermission("catalog.read")
  @ApiOperation({ summary: "List all programs for admin catalog with optional pagination" })
  @ApiResponse({ status: HttpStatus.OK, type: [AdminProgramDto] })
  async listPrograms(@Query() query?: PaginationQueryDto) {
    return this.catalogService.listAdminPrograms(query);
  }

  @Post("programs")
  @RequirePermission("catalog.write")
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Create a new program and generate its freshman semesters (Super Admin only)" })
  @ApiResponse({ status: HttpStatus.CREATED, type: AdminProgramDto })
  async createProgram(
    @CurrentUser("id") adminId: string,
    @Body() dto: ProgramInputDto,
  ): Promise<AdminProgramDto> {
    return this.catalogService.createAdminProgram(adminId, dto);
  }

  @Put("programs/:id")
  @RequirePermission("catalog.write")
  @ApiOperation({ summary: "Update program name or publish status (Super Admin only)" })
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
  @RequirePermission("catalog.write")
  @ApiOperation({ summary: "Delete an unused program (Super Admin only)" })
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
  @RequirePermission("catalog.read")
  @ApiOperation({ summary: "List all semesters for admin catalog with optional pagination" })
  @ApiResponse({ status: HttpStatus.OK, type: [AdminSemesterDto] })
  async listSemesters(@Query() query?: PaginationQueryDto) {
    return this.catalogService.listAdminSemesters(query);
  }

  @Put("semesters/:id")
  @RequirePermission("catalog.write")
  @ApiOperation({ summary: "Update semester publish status (Super Admin only)" })
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
  @RequirePermission("catalog.write")
  @ApiOperation({ summary: "Delete an unused semester (Super Admin only)" })
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
  @RequirePermission("catalog.read")
  @ApiOperation({ summary: "List courses with search, filters and pagination" })
  @ApiResponse({ status: HttpStatus.OK, type: CourseListResultDto })
  async listCourses(
    @CurrentUser() adminUser: any,
    @Query() query: CourseListQueryDto,
  ): Promise<CourseListResultDto> {
    return this.catalogService.listAdminCourses(query);
  }

  @Post("courses")
  @RequirePermission("catalog.write")
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Create a new catalog course (Super Admin only)" })
  @ApiResponse({ status: HttpStatus.CREATED, type: AdminCourseDto })
  async createCourse(
    @CurrentUser("id") adminId: string,
    @Body() dto: CreateCourseDto,
  ): Promise<AdminCourseDto> {
    return this.catalogService.createAdminCourse(adminId, dto);
  }

  @Put("courses/:id")
  @RequirePermission("course.edit", "catalog.write")
  @ApiOperation({ summary: "Update course metadata, trial items or publish status" })
  @ApiParam({ name: "id", description: "Course UUID" })
  @ApiResponse({ status: HttpStatus.OK, type: AdminCourseDto })
  async updateCourse(
    @CurrentUser() adminUser: any,
    @Param("id") id: string,
    @Body() dto: UpdateCourseDto,
  ): Promise<AdminCourseDto> {
    await this.scopeService.assertCourseInScope(adminUser, id);
    return this.catalogService.updateAdminCourse(adminUser?.id || adminUser, id, dto);
  }

  @Post("courses/:id/bump-version")
  @RequirePermission("course.edit", "catalog.write")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Increment course content version to trigger student update badges (ADM-03, DWN-06)" })
  @ApiParam({ name: "id", description: "Course UUID" })
  @ApiResponse({ status: HttpStatus.OK, type: AdminCourseDto })
  async bumpCourseVersion(
    @CurrentUser() adminUser: any,
    @Param("id") id: string,
  ): Promise<AdminCourseDto> {
    await this.scopeService.assertCourseInScope(adminUser, id);
    return this.catalogService.bumpCourseContentVersion(adminUser?.id || adminUser, id);
  }

  @Delete("courses/:id")
  @RequirePermission("catalog.write")
  @ApiOperation({ summary: "Delete an unused course (Super Admin only)" })
  @ApiParam({ name: "id", description: "Course UUID" })
  @ApiResponse({ status: HttpStatus.OK, type: AdminCourseDto })
  async deleteCourse(
    @CurrentUser("id") adminId: string,
    @Param("id") id: string,
  ): Promise<AdminCourseDto> {
    return this.catalogService.deleteAdminCourse(adminId, id);
  }
}
