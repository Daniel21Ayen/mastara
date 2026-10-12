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
import {
  SupportTicketsService,
  TicketBriefResponse,
  TicketDetailResponse,
  TicketMessageResponse,
} from "../services/support-tickets.service";
import { AddMessageDto, CreateTicketDto, GetTicketsQueryDto } from "../dto";
import { CurrentUser } from "../../../../common/decorators/current-user.decorator";
import { Role } from "@mastara/database";

@ApiTags("Engagement: Support Tickets")
@ApiBearerAuth()
@Controller("support/tickets")
export class SupportTicketsController {
  constructor(private readonly ticketsService: SupportTicketsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Open a new support ticket with an initial message" })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: "Ticket created",
  })
  async createTicket(
    @CurrentUser("id") studentId: string,
    @Body() dto: CreateTicketDto,
  ): Promise<TicketDetailResponse> {
    return this.ticketsService.createTicket(studentId, dto);
  }

  @Get()
  @ApiOperation({ summary: "List the student's support tickets" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "List of tickets, newest first",
  })
  async getStudentTickets(
    @CurrentUser("id") studentId: string,
    @Query() query: GetTicketsQueryDto,
  ): Promise<TicketBriefResponse[]> {
    return this.ticketsService.getStudentTickets(studentId, query);
  }

  @Get(":id")
  @ApiOperation({ summary: "Get ticket details with full message thread" })
  @ApiParam({ name: "id", description: "UUID of the ticket" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Full ticket with messages",
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: "Ticket not found" })
  async getTicketById(
    @CurrentUser("id") studentId: string,
    @Param("id", ParseUUIDPipe) ticketId: string,
  ): Promise<TicketDetailResponse> {
    return this.ticketsService.getTicketById(studentId, ticketId);
  }

  @Post(":id/messages")
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Add a message to an existing support ticket" })
  @ApiParam({ name: "id", description: "UUID of the ticket" })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: "Message added",
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: "Ticket not found" })
  async addMessage(
    @CurrentUser("id") studentId: string,
    @Param("id", ParseUUIDPipe) ticketId: string,
    @Body() dto: AddMessageDto,
  ): Promise<TicketMessageResponse> {
    return this.ticketsService.addMessage(studentId, Role.STUDENT, ticketId, dto);
  }
}
