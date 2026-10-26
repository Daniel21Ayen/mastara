import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Put,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { RequirePermission } from "../../../../common/decorators/require-permission.decorator";
import { CurrentUser } from "../../../../common/decorators/current-user.decorator";
import { PricingService, PricingSettings } from "../services/pricing.service";

@ApiTags("Admin: Pricing")
@ApiBearerAuth()
@Controller("commerce/admin/pricing")
export class AdminPricingController {
  constructor(private readonly pricingService: PricingService) {}

  @Get()
  @RequirePermission("pricing.read")
  @ApiOperation({ summary: "Get current administrative pricing configuration (F11h)" })
  @ApiResponse({ status: HttpStatus.OK, description: "Pricing configuration and free-trial defaults" })
  async getPricingSettings(): Promise<PricingSettings> {
    return this.pricingService.getAdminPricingSettings();
  }

  @Put()
  @HttpCode(HttpStatus.OK)
  @RequirePermission("pricing.write")
  @ApiOperation({ summary: "Update products and pricing form with free-trial defaults, audited in log (F11h)" })
  @ApiResponse({ status: HttpStatus.OK, description: "Updated pricing settings" })
  async updatePricingSettings(
    @CurrentUser("id") adminId: string,
    @Body() patch: Partial<PricingSettings>,
  ): Promise<PricingSettings> {
    return this.pricingService.updateAdminPricingSettings(adminId, patch);
  }
}
