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
import { Role } from "@mastara/database";
import { Roles } from "../../../../common/decorators/roles.decorator";
import { RolesGuard } from "../../../../common/guards/roles.guard";
import { CurrentUser } from "../../../../common/decorators/current-user.decorator";
import { PaymentProofsService } from "../services/payment-proofs.service";
import {
  AdminPaymentDto,
  PaymentDecisionDto,
  PaymentListQueryDto,
  PaymentListResultDto,
} from "../dto";

@ApiTags("Admin: Payments")
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Roles(Role.ADMIN)
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
}
