import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  UseGuards,
  HttpStatus,
  HttpCode,
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
import { AdminScansService } from "../services/admin-scans.service";
import { ScanListQueryDto, ListScanCoursesQueryDto } from "../dto/admin-scans.dto";
import type {
  AdminScan,
  ScanCourseOption,
  ScanListResult,
} from "@mastara/contracts";

@ApiTags("Admin Scan to PDF Management")
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Roles(Role.ADMIN)
@Controller("content/admin/scans")
export class AdminScansController {
  constructor(private readonly scansService: AdminScansService) {}

  @Get()
  @ApiOperation({ summary: "List scanned documents with filtering, search and pagination" })
  @ApiResponse({ status: HttpStatus.OK, description: "Paginated list of scans" })
  async listScans(@Query() query: ScanListQueryDto): Promise<ScanListResult> {
    return this.scansService.listScans(query);
  }

  @Get("courses")
  @ApiOperation({ summary: "List course options available for chosen program, semester and stream" })
  @ApiResponse({ status: HttpStatus.OK, description: "List of courses" })
  async listCourses(
    @Query() query: ListScanCoursesQueryDto,
  ): Promise<ScanCourseOption[]> {
    return this.scansService.listCourses(
      query.programId,
      query.semesterNumber,
      query.stream,
    );
  }

  @Get(":id")
  @ApiOperation({ summary: "Get detailed scan document record by ID" })
  @ApiParam({ name: "id", description: "Scan UUID" })
  @ApiResponse({ status: HttpStatus.OK, description: "Scan details" })
  async getScan(@Param("id") id: string): Promise<AdminScan> {
    return this.scansService.getScan(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Create a new scan document and record audit log" })
  @ApiResponse({ status: HttpStatus.CREATED, description: "Scan created" })
  async createScan(
    @Body() body: unknown,
    @CurrentUser("id") adminId: string,
  ): Promise<AdminScan> {
    return this.scansService.createScan(body, adminId);
  }
}
