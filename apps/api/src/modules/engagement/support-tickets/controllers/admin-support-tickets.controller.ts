import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
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
import { SupportTicketsService } from "../services/support-tickets.service";
import {
  AdminTicketsQueryDto,
  ReplyTicketDto,
  SetTicketStatusDto,
} from "../dto";

@ApiTags("Admin: Support Tickets")
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Roles(Role.ADMIN)
@Controller("support/admin/tickets")
export class AdminSupportTicketsController {
  constructor(private readonly ticketsService: SupportTicketsService) {}

  @Get("stats")
  @ApiOperation({ summary: "Get support ticket count metrics (open, answered, resolved, total)" })
  async getStats() {
    return this.ticketsService.getAdminStats();
  }

  @Get()
  @ApiOperation({ summary: "List all support tickets with filtering, query and pagination" })
  async listTickets(@Query() query: AdminTicketsQueryDto) {
    return this.ticketsService.getAdminTickets(query);
  }

  @Get(":id")
  @ApiOperation({ summary: "Get single ticket details with student profile and messages" })
  @ApiParam({ name: "id", description: "UUID of the ticket" })
  async getTicket(@Param("id", ParseUUIDPipe) id: string) {
    return this.ticketsService.getAdminTicketById(id);
  }

  @Post(":id/reply")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Reply to a support ticket as admin" })
  @ApiParam({ name: "id", description: "UUID of the ticket" })
  async replyTicket(
    @CurrentUser("id") adminId: string,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: ReplyTicketDto,
  ) {
    return this.ticketsService.replyAdminTicket(adminId, id, dto.message);
  }

  @Patch(":id/status")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Update ticket status (e.g. RESOLVED, OPEN)" })
  @ApiParam({ name: "id", description: "UUID of the ticket" })
  async setStatus(
    @CurrentUser("id") adminId: string,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: SetTicketStatusDto,
  ) {
    return this.ticketsService.setAdminTicketStatus(adminId, id, dto.status);
  }
}
