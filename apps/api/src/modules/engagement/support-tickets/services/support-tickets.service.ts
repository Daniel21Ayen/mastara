import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  Optional,
} from "@nestjs/common";
import { PrismaService } from "../../../../infrastructure/database/prisma.service";
import { Role, TicketStatus } from "@mastara/database";
import {
  AddMessageDto,
  AdminTicketsQueryDto,
  CreateTicketDto,
  GetTicketsQueryDto,
} from "../dto";
import { PushService } from "../../../../infrastructure/push/push.service";
import { AuditService } from "../../../platform/audit/services/audit.service";

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

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    @Optional() private readonly pushService?: PushService,
  ) {}

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
  // Admin Operations
  // --------------------------------------------------------------------------

  async getAdminStats(): Promise<{ total: number; open: number; answered: number; resolved: number }> {
    const [total, open, answered, resolved] = await Promise.all([
      this.prisma.supportTicket.count(),
      this.prisma.supportTicket.count({
        where: {
          status: {
            in: [TicketStatus.OPEN, TicketStatus.IN_PROGRESS],
          },
        },
      }),
      this.prisma.supportTicket.count({
        where: {
          status: TicketStatus.ANSWERED,
        },
      }),
      this.prisma.supportTicket.count({
        where: {
          status: {
            in: [TicketStatus.RESOLVED, TicketStatus.CLOSED],
          },
        },
      }),
    ]);

    return { total, open, answered, resolved };
  }

  async getAdminTickets(query: AdminTicketsQueryDto) {
    const where: any = {};

    if (query.status) {
      if (query.status === TicketStatus.OPEN) {
        where.status = { in: [TicketStatus.OPEN, TicketStatus.IN_PROGRESS] };
      } else if (query.status === TicketStatus.RESOLVED) {
        where.status = { in: [TicketStatus.RESOLVED, TicketStatus.CLOSED] };
      } else {
        where.status = query.status;
      }
    }

    if (query.category && query.category !== "ALL") {
      where.category = query.category;
    }

    if (query.priority && query.priority !== "ALL") {
      where.priority = query.priority;
    }

    if (query.q && query.q.trim()) {
      const term = query.q.trim();
      where.OR = [
        { subject: { contains: term, mode: "insensitive" } },
        {
          student: {
            OR: [
              { first_name: { contains: term, mode: "insensitive" } },
              { last_name: { contains: term, mode: "insensitive" } },
              { email: { contains: term, mode: "insensitive" } },
              { phone: { contains: term, mode: "insensitive" } },
            ],
          },
        },
        {
          messages: {
            some: {
              body: { contains: term, mode: "insensitive" },
            },
          },
        },
      ];
    }

    const page = Math.max(1, Number(query.page) || 1);
    const pageSize = Math.min(50, Math.max(1, Number(query.pageSize) || 20));
    const skip = (page - 1) * pageSize;

    const [total, rawTickets] = await Promise.all([
      this.prisma.supportTicket.count({ where }),
      this.prisma.supportTicket.findMany({
        where,
        include: {
          student: {
            include: {
              university: true,
              program: true,
            },
          },
          messages: {
            orderBy: { created_at: "asc" },
          },
        },
        orderBy: { updated_at: "desc" },
        skip,
        take: pageSize,
      }),
    ]);

    // Sort: open/in_progress tickets first, then newest updated
    const sorted = [...rawTickets].sort((a, b) => {
      const aOpen = a.status === TicketStatus.OPEN || a.status === TicketStatus.IN_PROGRESS;
      const bOpen = b.status === TicketStatus.OPEN || b.status === TicketStatus.IN_PROGRESS;
      if (aOpen && !bOpen) return -1;
      if (!aOpen && bOpen) return 1;
      return b.updated_at.getTime() - a.updated_at.getTime();
    });

    return {
      tickets: sorted.map((t) => this._mapAdminTicket(t)),
      total,
    };
  }

  async getAdminTicketById(ticketId: string) {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id: ticketId },
      include: {
        student: {
          include: {
            university: true,
            program: true,
          },
        },
        messages: {
          orderBy: { created_at: "asc" },
        },
      },
    });

    if (!ticket) {
      throw new NotFoundException(`Ticket not found with ID ${ticketId}`);
    }

    return this._mapAdminTicket(ticket);
  }

  async replyAdminTicket(adminId: string, ticketId: string, messageText: string) {
    const existing = await this.prisma.supportTicket.findUnique({
      where: { id: ticketId },
      include: { student: true },
    });

    if (!existing) {
      throw new NotFoundException(`Ticket not found with ID ${ticketId}`);
    }

    const [_, updatedTicket] = await this.prisma.$transaction([
      this.prisma.supportMessage.create({
        data: {
          ticket_id: ticketId,
          sender_id: adminId,
          sender_role: Role.ADMIN,
          body: messageText.trim(),
        },
      }),
      this.prisma.supportTicket.update({
        where: { id: ticketId },
        data: {
          status: TicketStatus.ANSWERED,
          updated_at: new Date(),
        },
        include: {
          student: {
            include: {
              university: true,
              program: true,
            },
          },
          messages: {
            orderBy: { created_at: "asc" },
          },
        },
      }),
    ]);

    await this.auditService.log({
      actorId: adminId,
      actorRole: Role.ADMIN,
      action: "SUPPORT_TICKET_REPLIED",
      targetType: "SupportTicket",
      targetId: ticketId,
      metadata: {
        snippet: messageText.slice(0, 100),
      },
    });

    if (this.pushService) {
      void this.pushService
        .sendToStudent(updatedTicket.student_id, {
          title: "Support Reply / የድጋፍ ምላሽ",
          body: messageText.slice(0, 100),
          data: {
            type: "SUPPORT_REPLY",
            ticketId,
          },
          channelId: "default",
        })
        .catch((err: any) => this.logger.warn(`Push to student failed: ${err?.message || err}`));
    }

    return this._mapAdminTicket(updatedTicket);
  }

  async setAdminTicketStatus(adminId: string, ticketId: string, status: TicketStatus) {
    const existing = await this.prisma.supportTicket.findUnique({
      where: { id: ticketId },
    });

    if (!existing) {
      throw new NotFoundException(`Ticket not found with ID ${ticketId}`);
    }

    const [updatedTicket] = await this.prisma.$transaction([
      this.prisma.supportTicket.update({
        where: { id: ticketId },
        data: {
          status,
          updated_at: new Date(),
        },
        include: {
          student: {
            include: {
              university: true,
              program: true,
            },
          },
          messages: {
            orderBy: { created_at: "asc" },
          },
        },
      }),
    ]);

    if (status === TicketStatus.RESOLVED || status === TicketStatus.CLOSED) {
      await this.auditService.log({
        actorId: adminId,
        actorRole: Role.ADMIN,
        action: "SUPPORT_TICKET_RESOLVED",
        targetType: "SupportTicket",
        targetId: ticketId,
      });
    }

    return this._mapAdminTicket(updatedTicket);
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

  private _mapAdminTicket(ticket: any) {
    const student = ticket.student;
    const fullName = student
      ? `${student.first_name ?? ""} ${student.last_name ?? ""}`.trim()
      : "Unknown Student";
    const identifier = student?.phone || student?.email || ticket.student_id;

    let normalizedStatus: "OPEN" | "ANSWERED" | "RESOLVED" = "OPEN";
    if (ticket.status === TicketStatus.RESOLVED || ticket.status === TicketStatus.CLOSED) {
      normalizedStatus = "RESOLVED";
    } else if (ticket.status === TicketStatus.ANSWERED) {
      normalizedStatus = "ANSWERED";
    } else {
      normalizedStatus = "OPEN";
    }

    return {
      id: ticket.id,
      studentId: ticket.student_id,
      studentName: fullName || "Student",
      studentIdentifier: identifier,
      studentUniversity: student?.university?.name_en || student?.university?.name_am || undefined,
      studentProgram: student?.program?.name_en || student?.program?.name_am || undefined,
      category: ticket.category || "GENERAL",
      priority: (ticket.priority as "LOW" | "NORMAL" | "HIGH" | "URGENT") || "NORMAL",
      subject: ticket.subject,
      status: normalizedStatus,
      createdAt: ticket.created_at.toISOString(),
      updatedAt: ticket.updated_at.toISOString(),
      messages: (ticket.messages || []).map((m: any) => ({
        id: m.id,
        from: m.sender_role === Role.ADMIN ? "ADMIN" : "STUDENT",
        text: m.body,
        createdAt: m.created_at.toISOString(),
      })),
    };
  }
}

