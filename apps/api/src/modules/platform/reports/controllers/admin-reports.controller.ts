import {
  Controller,
  Get,
  HttpStatus,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { RequirePermission } from "../../../../common/decorators/require-permission.decorator";
import { ReportsService, PlatformReportsSummary } from "../services/reports.service";

@ApiTags("Admin: Reports & Analytics")
@ApiBearerAuth()
@Controller("reports/admin")
export class AdminReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get("summary")
  @RequirePermission("reports.ops", "reports.academic")
  @ApiOperation({ summary: "Get aggregated operational and academic reports (FR-194, F11i)" })
  @ApiResponse({ status: HttpStatus.OK, description: "Platform revenue, student trends, and course performance" })
  async getSummary(): Promise<PlatformReportsSummary> {
    return this.reportsService.getPlatformReports();
  }
}
