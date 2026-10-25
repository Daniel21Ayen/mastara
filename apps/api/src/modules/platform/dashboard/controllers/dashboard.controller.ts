import { Controller, Get, HttpCode, HttpStatus } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { RequirePermission } from "../../../../common/decorators/require-permission.decorator";
import { DashboardService } from "../services/dashboard.service";
import { DashboardSummaryDto } from "../dto/dashboard-summary.dto";

@ApiTags("Platform: Dashboard")
@ApiBearerAuth()
@Controller("dashboard")
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get("summary")
  @RequirePermission("reports.academic", "reports.ops", "audit.read")
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
