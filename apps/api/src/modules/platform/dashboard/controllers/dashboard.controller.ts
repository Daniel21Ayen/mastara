import { Controller, Get, HttpCode, HttpStatus, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { Role } from "@mastara/database";
import { Roles } from "../../../../common/decorators/roles.decorator";
import { RolesGuard } from "../../../../common/guards/roles.guard";
import { DashboardService } from "../services/dashboard.service";
import { DashboardSummaryDto } from "../dto/dashboard-summary.dto";

@ApiTags("Platform: Dashboard")
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Controller("dashboard")
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get("summary")
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Get administrator dashboard KPI cards, registration trends, and activity feed",
  })
  @ApiResponse({
    status: HttpStatus.OK,
    type: DashboardSummaryDto,
    description: "Dashboard summary retrieved successfully",
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: "Requires administrator privileges",
  })
  async getSummary(): Promise<DashboardSummaryDto> {
    return this.dashboardService.getSummary();
  }
}
