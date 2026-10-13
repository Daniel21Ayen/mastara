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
import { OrdersService, OrderResponse } from "../services/orders.service";
import { CreateOrderDto, GetOrdersQueryDto } from "../dto";
import { CurrentUser } from "../../../../common/decorators/current-user.decorator";

@ApiTags("Commerce: Orders")
@ApiBearerAuth()
@Controller("commerce/orders")
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: "Place a new order with server-authoritative pricing validation",
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: "Order created in PENDING_PAYMENT status",
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: "Invalid payment reference or bundle course count",
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: "Transaction reference has already been used",
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: "One or more selected courses not found",
  })
  async createOrder(
    @CurrentUser("id") studentId: string,
    @Body() dto: CreateOrderDto,
  ): Promise<OrderResponse> {
    return this.ordersService.createOrder(studentId, dto);
  }

  @Get()
  @ApiOperation({ summary: "List the authenticated student's orders" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "List of orders, newest first",
  })
  async getStudentOrders(
    @CurrentUser("id") studentId: string,
    @Query() query: GetOrdersQueryDto,
  ): Promise<OrderResponse[]> {
    return this.ordersService.getStudentOrders(studentId, query);
  }

  @Get(":id")
  @ApiOperation({ summary: "Get full details of a specific order" })
  @ApiParam({ name: "id", description: "UUID of the order" })
  @ApiResponse({ status: HttpStatus.OK, description: "Order details" })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: "Order not found",
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: "Order belongs to a different student",
  })
  async getOrderById(
    @CurrentUser("id") studentId: string,
    @Param("id", ParseUUIDPipe) orderId: string,
  ): Promise<OrderResponse> {
    return this.ordersService.getOrderById(studentId, orderId);
  }
}
