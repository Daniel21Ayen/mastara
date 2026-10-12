import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { PaymentProofsService, ProofResponse } from "../services/payment-proofs.service";
import { SubmitProofDto } from "../dto";
import { CurrentUser } from "../../../../common/decorators/current-user.decorator";

@ApiTags("Commerce: Payment Proofs")
@ApiBearerAuth()
@Controller("commerce/orders")
export class PaymentProofsController {
  constructor(private readonly proofsService: PaymentProofsService) {}

  @Post(":orderId/proof")
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: "Submit a payment receipt proof for a pending order",
  })
  @ApiParam({ name: "orderId", description: "UUID of the order" })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: "Proof submitted, order advanced to PAYMENT_SUBMITTED",
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: "Proof already submitted or reference already used",
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: "Invalid transaction reference or receipt too large",
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: "Order not found",
  })
  async submitProof(
    @CurrentUser("id") studentId: string,
    @Param("orderId", ParseUUIDPipe) orderId: string,
    @Body() dto: SubmitProofDto,
  ): Promise<ProofResponse> {
    return this.proofsService.submitProof(studentId, orderId, dto);
  }

  @Get(":orderId/proof")
  @ApiOperation({ summary: "Get the payment proof attached to an order" })
  @ApiParam({ name: "orderId", description: "UUID of the order" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Payment proof details",
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: "Order or proof not found",
  })
  async getProof(
    @CurrentUser("id") studentId: string,
    @Param("orderId", ParseUUIDPipe) orderId: string,
  ): Promise<ProofResponse> {
    return this.proofsService.getProofByOrderId(studentId, orderId);
  }
}
