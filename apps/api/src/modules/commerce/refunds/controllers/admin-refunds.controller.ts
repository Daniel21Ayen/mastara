import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { RequirePermission } from "../../../../common/decorators/require-permission.decorator";
import { CurrentUser } from "../../../../common/decorators/current-user.decorator";
import { RefundsService } from "../services/refunds.service";
import {
  AdminRefundDto,
  CreateRefundDto,
  DecideRefundDto,
  PayoutRefundDto,
  QueryRefundsDto,
  RefundListResultDto,
} from "../dto";

@ApiTags("Admin: Refunds")
@ApiBearerAuth()
@Controller("admin/refunds")
export class AdminRefundsController {
  constructor(private readonly refundsService: RefundsService) {}

  @Post("request")
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission("refunds.request")
  @ApiOperation({ summary: "Operations Admin requests a refund for an approved order (SRS 5.5, FR-G64)" })
  @ApiResponse({ status: HttpStatus.CREATED, type: AdminRefundDto })
  async requestRefund(
    @CurrentUser("id") adminId: string,
    @Body() dto: CreateRefundDto,
  ): Promise<AdminRefundDto> {
    return this.refundsService.requestRefund(adminId, dto);
  }

  @Post(":id/decide")
  @HttpCode(HttpStatus.OK)
  @RequirePermission("refunds.approve")
  @ApiOperation({ summary: "Super Admin approves or rejects refund. Approval revokes entitlements (FR-G64)" })
  @ApiParam({ name: "id", description: "UUID of the refund or order" })
  @ApiResponse({ status: HttpStatus.OK, type: AdminRefundDto })
  async decideRefund(
    @CurrentUser("id") adminId: string,
    @Param("id") id: string,
    @Body() dto: DecideRefundDto,
  ): Promise<AdminRefundDto> {
    return this.refundsService.decideRefund(adminId, id, dto);
  }

  @Post(":id/payout")
  @HttpCode(HttpStatus.OK)
  @RequirePermission("refunds.approve")
  @ApiOperation({ summary: "Super Admin records manual payout transaction reference outside platform" })
  @ApiParam({ name: "id", description: "UUID of the refund" })
  @ApiResponse({ status: HttpStatus.OK, type: AdminRefundDto })
  async payoutRefund(
    @CurrentUser("id") adminId: string,
    @Param("id") id: string,
    @Body() dto: PayoutRefundDto,
  ): Promise<AdminRefundDto> {
    return this.refundsService.payoutRefund(adminId, id, dto);
  }

  @Get()
  @RequirePermission("refunds.request", "refunds.approve", "payments.review")
  @ApiOperation({ summary: "List refunds with status filtering, search and pagination" })
  @ApiResponse({ status: HttpStatus.OK, type: RefundListResultDto })
  async listRefunds(@Query() query: QueryRefundsDto): Promise<RefundListResultDto> {
    return this.refundsService.getRefunds(query);
  }

  @Get(":id")
  @RequirePermission("refunds.request", "refunds.approve", "payments.review")
  @ApiOperation({ summary: "Get single refund record details" })
  @ApiParam({ name: "id", description: "UUID of the refund or order" })
  @ApiResponse({ status: HttpStatus.OK, type: AdminRefundDto })
  async getRefund(@Param("id") id: string): Promise<AdminRefundDto> {
    return this.refundsService.getRefundById(id);
  }
}
