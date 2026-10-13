import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../../../../infrastructure/database/prisma.service";
import { Role, TicketStatus } from "@mastara/database";
import { CreateTicketDto, AddMessageDto, GetTicketsQueryDto } from "../dto";

export interface TicketMessageResponse {
  id: string;
  from: "STUDENT" | "ADMIN";
  body: string;
  createdAt: Date;
}

export interface TicketBriefResponse {
  id: string;
  subject: string;
  status: TicketStatus;
  messageCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface TicketDetailResponse {
  id: string;
  subject: string;
  status: TicketStatus;
  messages: TicketMessageResponse[];
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class SupportTicketsService {
  private readonly logger = new Logger(SupportTicketsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Creates a new support ticket with an initial student message.
   */
  async createTicket(
    studentId: string,
    dto: CreateTicketDto,
  ): Promise<TicketDetailResponse> {
    const ticket = await this.prisma.supportTicket.create({
      data: {
        student_id: studentId,
        subject: dto.subject,
        status: TicketStatus.OPEN,
        messages: {
          create: {
            sender_id: studentId,
            sender_role: Role.STUDENT,
            body: dto.message,
          },
        },
      },
      include: {
        messages: { orderBy: { created_at: "asc" } },
      },
    });

    this.logger.log(`Ticket ${ticket.id} created by student ${studentId}`);
    return this._mapDetail(ticket);
  }

  /**
   * Lists a student's support tickets with optional status filter.
   */
  async getStudentTickets(
    studentId: string,
    query: GetTicketsQueryDto,
  ): Promise<TicketBriefResponse[]> {
    const tickets = await this.prisma.supportTicket.findMany({
      where: {
        student_id: studentId,
        ...(query.status ? { status: query.status } : {}),
      },
      include: {
        _count: { select: { messages: true } },
      },
      orderBy: { updated_at: "desc" },
    });

    return tickets.map((t) => ({
      id: t.id,
      subject: t.subject,
      status: t.status,
      messageCount: t._count.messages,
      createdAt: t.created_at,
      updatedAt: t.updated_at,
    }));
  }

  /**
   * Returns full ticket details with all messages, verifying student ownership.
   */
  async getTicketById(
    studentId: string,
    ticketId: string,
  ): Promise<TicketDetailResponse> {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id: ticketId },
      include: {
        messages: { orderBy: { created_at: "asc" } },
      },
    });

    if (!ticket) {
      throw new NotFoundException(`Ticket not found with ID ${ticketId}`);
    }
    if (ticket.student_id !== studentId) {
      throw new ForbiddenException("You do not have access to this ticket");
    }

    return this._mapDetail(ticket);
  }

  /**
   * Appends a message to an open ticket. Supports both student and admin senders.
   */
  async addMessage(
    senderId: string,
    senderRole: Role,
    ticketId: string,
    dto: AddMessageDto,
  ): Promise<TicketMessageResponse> {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id: ticketId },
    });

    if (!ticket) {
      throw new NotFoundException(`Ticket not found with ID ${ticketId}`);
    }

    // Students can only message their own tickets; admins can message any
    if (senderRole === Role.STUDENT && ticket.student_id !== senderId) {
      throw new ForbiddenException("You do not have access to this ticket");
    }

    const [message] = await this.prisma.$transaction([
      this.prisma.supportMessage.create({
        data: {
          ticket_id: ticketId,
          sender_id: senderId,
          sender_role: senderRole,
          body: dto.body,
        },
      }),
      // Re-open ticket if admin replies to a closed one
      this.prisma.supportTicket.update({
        where: { id: ticketId },
        data: {
          updated_at: new Date(),
          status:
            ticket.status === TicketStatus.RESOLVED || ticket.status === TicketStatus.CLOSED
              ? TicketStatus.IN_PROGRESS
              : ticket.status,
        },
      }),
    ]);

    return {
      id: message.id,
      from: senderRole === Role.ADMIN ? "ADMIN" : "STUDENT",
      body: message.body,
      createdAt: message.created_at,
    };
  }

  // --------------------------------------------------------------------------
  // Private helpers
  // --------------------------------------------------------------------------

  private _mapDetail(ticket: any): TicketDetailResponse {
    return {
      id: ticket.id,
      subject: ticket.subject,
      status: ticket.status,
      messages: (ticket.messages ?? []).map((m: any) => ({
        id: m.id,
        from: m.sender_role === Role.ADMIN ? "ADMIN" : "STUDENT",
        body: m.body,
        createdAt: m.created_at,
      })),
      createdAt: ticket.created_at,
      updatedAt: ticket.updated_at,
    };
  }
}
