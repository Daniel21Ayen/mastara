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
import { CurrentUser } from "../../../../common/decorators/current-user.decorator";
import { PaymentProofsService } from "../services/payment-proofs.service";
import {
  AdminPaymentDto,
  PaymentDecisionDto,
  PaymentListQueryDto,
  PaymentListResultDto,
  RefundDecisionDto,
  RefundRequestDto,
} from "../dto";

import { RequirePermission } from "../../../../common/decorators/require-permission.decorator";

@ApiTags("Admin: Payments")
@ApiBearerAuth()
@RequirePermission("payments.review")
@Controller("commerce/payments")
export class AdminPaymentsController {
  constructor(private readonly paymentProofsService: PaymentProofsService) {}

  @Get()
  @ApiOperation({ summary: "List payments with filtering and pagination" })
  @ApiResponse({ status: HttpStatus.OK, type: PaymentListResultDto })
  async listPayments(@Query() query: PaymentListQueryDto): Promise<PaymentListResultDto> {
    return this.paymentProofsService.getAdminPayments(query);
  }

  @Get(":id")
  @ApiOperation({ summary: "Get single payment details for review" })
  @ApiParam({ name: "id", description: "Payment proof ID or Order ID" })
  @ApiResponse({ status: HttpStatus.OK, type: AdminPaymentDto })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: "Payment not found" })
  async getPayment(@Param("id") id: string): Promise<AdminPaymentDto> {
    return this.paymentProofsService.getAdminPaymentById(id);
  }

  @Post(":id/decide")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Approve or reject a payment proof" })
  @ApiParam({ name: "id", description: "Payment proof ID or Order ID" })
  @ApiResponse({ status: HttpStatus.OK, type: AdminPaymentDto })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: "Payment not found" })
  @ApiResponse({ status: HttpStatus.CONFLICT, description: "Payment already decided" })
  async decidePayment(
    @CurrentUser("id") adminId: string,
    @Param("id") id: string,
    @Body() decision: PaymentDecisionDto,
  ): Promise<AdminPaymentDto> {
    return this.paymentProofsService.decidePayment(adminId, id, decision);
  }

  @Post(":id/refund-request")
  @HttpCode(HttpStatus.OK)
  @RequirePermission("refunds.request")
  @ApiOperation({ summary: "Request a refund for an approved order (FR-G64)" })
  @ApiParam({ name: "id", description: "Payment proof ID or Order ID" })
  @ApiResponse({ status: HttpStatus.OK, description: "Refund request initiated" })
  async requestRefund(
    @CurrentUser("id") adminId: string,
    @Param("id") id: string,
    @Body() dto: RefundRequestDto,
  ) {
    return this.paymentProofsService.requestRefund(adminId, id, dto);
  }

  @Post(":id/refund-decide")
  @HttpCode(HttpStatus.OK)
  @RequirePermission("refunds.approve")
  @ApiOperation({ summary: "Approve or reject a refund, revoking entitlements on approval (FR-G64)" })
  @ApiParam({ name: "id", description: "Payment proof ID or Order ID" })
  @ApiResponse({ status: HttpStatus.OK, description: "Refund decided" })
  async decideRefund(
    @CurrentUser("id") adminId: string,
    @Param("id") id: string,
    @Body() dto: RefundDecisionDto,
  ) {
    return this.paymentProofsService.decideRefund(adminId, id, dto);
  }
}
