import { Controller, Get, HttpCode, HttpStatus, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { Role } from "@mastara/database";
import { Roles } from "../../../../common/decorators/roles.decorator";
import { RolesGuard } from "../../../../common/guards/roles.guard";
import { AuditService } from "../services/audit.service";
import { AuditEntryDto, QueryAuditLogsDto } from "../dto";

@ApiTags("Platform: Audit Logs")
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Controller("platform/admin/audit")
export class AdminAuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Get attention-required audit logs with filtering (database storage conserved)",
  })
  @ApiResponse({
    status: HttpStatus.OK,
    type: [AuditEntryDto],
    description: "Attention audit log entries retrieved successfully",
  })
  async getAuditLogs(@Query() query: QueryAuditLogsDto): Promise<AuditEntryDto[]> {
    return this.auditService.getAttentionAuditLogs(query);
  }

  @Get("attention")
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Get top recent attention-required audit entries for profile drawer and quick alerts",
  })
  @ApiResponse({
    status: HttpStatus.OK,
    type: [AuditEntryDto],
    description: "Recent attention items retrieved successfully",
  })
  async getAttentionItems(): Promise<AuditEntryDto[]> {
    return this.auditService.getRecentAttentionLogs(8);
  }
}
