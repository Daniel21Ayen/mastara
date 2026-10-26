import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../../../../infrastructure/database/prisma.service";
import {
  EntitlementStatus,
  OrderStatus,
  RefundStatus,
  Role,
} from "@mastara/database";
import { AuditService } from "../../../platform/audit/services/audit.service";
import { PushService } from "../../../../infrastructure/push/push.service";
import {
  AdminRefundDto,
  CreateRefundDto,
  DecideRefundDto,
  PayoutRefundDto,
  QueryRefundsDto,
  RefundListResultDto,
} from "../dto";

@Injectable()
export class RefundsService {
  private readonly logger = new Logger(RefundsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly pushService: PushService,
  ) {}

  /**
   * Operations Admin initiates a refund request for an approved order with a required reason (SRS 5.5, FR-G64).
   */
  async requestRefund(adminId: string, dto: CreateRefundDto): Promise<AdminRefundDto> {
    const order = await this.prisma.order.findUnique({
      where: { id: dto.orderId },
      include: {
        student: true,
        refunds: {
          where: {
            status: { in: [RefundStatus.REQUESTED, RefundStatus.APPROVED, RefundStatus.PAID_OUT, RefundStatus.ENTITLEMENT_REVOKED] },
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException(`Order not found with ID: ${dto.orderId}`);
    }

    if (order.status !== OrderStatus.APPROVED) {
      throw new ConflictException("Refund can only be requested for APPROVED orders");
    }

    if (order.refunds && order.refunds.length > 0) {
      throw new ConflictException("An active refund request already exists for this order");
    }

    const refund = await this.prisma.refund.create({
      data: {
        order_id: order.id,
        student_id: order.student_id,
        amount: order.quoted_amount,
        reason: dto.reason.trim(),
        status: RefundStatus.REQUESTED,
        requested_by: adminId,
      },
      include: {
        order: { include: { student: true } },
        student: true,
      },
    });

    await this.auditService.log({
      actorId: adminId,
      actorRole: Role.ADMIN,
      action: "REFUND_REQUESTED",
      targetType: "Refund",
      targetId: refund.id,
      metadata: {
        orderId: order.id,
        amount: Number(order.quoted_amount),
        reason: dto.reason,
        requestedBy: adminId,
      },
    });

    this.logger.log(`Refund requested for order ${order.id} by admin ${adminId}`);
    return this._mapRefund(refund);
  }

  /**
   * Super Admin approves or rejects refund. Approval atomically revokes all entitlements (SRS 5.5, FR-G64).
   */
  async decideRefund(
    adminId: string,
    id: string,
    dto: DecideRefundDto,
  ): Promise<AdminRefundDto> {
    const refund = await this.prisma.refund.findFirst({
      where: {
        OR: [{ id }, { order_id: id }],
      },
      include: {
        order: {
          include: {
            entitlements: true,
            student: true,
          },
        },
        student: true,
      },
    });

    if (!refund) {
      throw new NotFoundException(`Refund record not found for ID: ${id}`);
    }

    if (refund.status !== RefundStatus.REQUESTED) {
      throw new ConflictException(`Refund has already been decided (current status: ${refund.status})`);
    }

    const decisionReason = dto.reason?.trim() || (dto.action === "APPROVE" ? "Refund approved by Super Admin" : "Refund rejected");

    if (dto.action === "REJECT") {
      const rejected = await this.prisma.refund.update({
        where: { id: refund.id },
        data: {
          status: RefundStatus.REJECTED,
          reviewed_by: adminId,
          decision_reason: decisionReason,
        },
        include: {
          order: { include: { student: true } },
          student: true,
        },
      });

      await this.auditService.log({
        actorId: adminId,
        actorRole: Role.ADMIN,
        action: "REFUND_REJECTED",
        targetType: "Refund",
        targetId: refund.id,
        metadata: {
          orderId: refund.order_id,
          reason: decisionReason,
          rejectedBy: adminId,
        },
      });

      return this._mapRefund(rejected);
    }

    // APPROVAL FLOW: Revoke entitlements, update order to CANCELLED, set refund status
    const payoutRef = dto.payoutReference?.trim() || null;
    const finalStatus = payoutRef ? RefundStatus.PAID_OUT : RefundStatus.ENTITLEMENT_REVOKED;

    const [updatedRefund] = await this.prisma.$transaction([
      this.prisma.refund.update({
        where: { id: refund.id },
        data: {
          status: finalStatus,
          reviewed_by: adminId,
          decision_reason: decisionReason,
          payout_reference: payoutRef,
          paid_out_at: payoutRef ? new Date() : null,
        },
        include: {
          order: { include: { student: true } },
          student: true,
        },
      }),
      this.prisma.entitlement.updateMany({
        where: { order_id: refund.order_id },
        data: {
          status: EntitlementStatus.REVOKED,
          revoked_by: adminId,
          revoke_reason: decisionReason,
        },
      }),
      this.prisma.order.update({
        where: { id: refund.order_id },
        data: { status: OrderStatus.CANCELLED },
      }),
    ]);

    // Audit logs for refund approval and revocation
    await this.auditService.log({
      actorId: adminId,
      actorRole: Role.ADMIN,
      action: "REFUND_APPROVED",
      targetType: "Refund",
      targetId: refund.id,
      metadata: {
        orderId: refund.order_id,
        studentId: refund.student_id,
        payoutReference: payoutRef,
        reason: decisionReason,
      },
    });

    const entitlements = refund.order?.entitlements ?? [];
    for (const ent of entitlements) {
      await this.auditService.log({
        actorId: adminId,
        actorRole: Role.ADMIN,
        action: "ENTITLEMENT_REVOKED",
        targetType: "Entitlement",
        targetId: ent.id,
        metadata: {
          orderId: refund.order_id,
          courseId: ent.course_id,
          reason: decisionReason,
        },
      });
    }

    // Send push notification to student about refund
    void this.pushService.sendToStudent(refund.student_id, {
      title: "Refund Approved",
      body: "Your refund request was approved and access has been updated.",
      data: { type: "REFUND_APPROVED", orderId: refund.order_id },
      channelId: "payments",
    });

    return this._mapRefund(updatedRefund);
  }

  /**
   * Super Admin records external manual payout reference (e.g. CBE or Telebirr bank reference).
   */
  async payoutRefund(
    adminId: string,
    id: string,
    dto: PayoutRefundDto,
  ): Promise<AdminRefundDto> {
    const refund = await this.prisma.refund.findUnique({
      where: { id },
      include: {
        order: { include: { student: true } },
        student: true,
      },
    });

    if (!refund) {
      throw new NotFoundException(`Refund not found with ID: ${id}`);
    }

    if (
      refund.status !== RefundStatus.APPROVED &&
      refund.status !== RefundStatus.ENTITLEMENT_REVOKED
    ) {
      throw new ConflictException(`Only approved refunds can be marked as paid out (current: ${refund.status})`);
    }

    const paidOutAt = dto.paidOutAt ? new Date(dto.paidOutAt) : new Date();

    const updated = await this.prisma.refund.update({
      where: { id },
      data: {
        status: RefundStatus.PAID_OUT,
        payout_reference: dto.payoutReference.trim(),
        paid_out_at: paidOutAt,
      },
      include: {
        order: { include: { student: true } },
        student: true,
      },
    });

    await this.auditService.log({
      actorId: adminId,
      actorRole: Role.ADMIN,
      action: "REFUND_PAID_OUT",
      targetType: "Refund",
      targetId: refund.id,
      metadata: {
        orderId: refund.order_id,
        payoutReference: dto.payoutReference,
      },
    });

    return this._mapRefund(updated);
  }

  /**
   * List all refund records with status filtering, search, and pagination.
   */
  async getRefunds(query: QueryRefundsDto): Promise<RefundListResultDto> {
    const page = Math.max(1, query.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, query.pageSize ?? 10));
    const skip = (page - 1) * pageSize;

    const where: any = {};

    if (query.status) {
      where.status = query.status;
    }

    if (query.q && query.q.trim()) {
      const q = query.q.trim();
      where.OR = [
        { id: { contains: q, mode: "insensitive" } },
        { order_id: { contains: q, mode: "insensitive" } },
        { reason: { contains: q, mode: "insensitive" } },
        { payout_reference: { contains: q, mode: "insensitive" } },
        {
          student: {
            OR: [
              { first_name: { contains: q, mode: "insensitive" } },
              { last_name: { contains: q, mode: "insensitive" } },
              { phone: { contains: q, mode: "insensitive" } },
            ],
          },
        },
      ];
    }

    const [total, items] = await Promise.all([
      this.prisma.refund.count({ where }),
      this.prisma.refund.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: [{ created_at: "desc" }, { id: "asc" }],
        include: {
          order: { include: { student: true } },
          student: true,
        },
      }),
    ]);

    const totalPages = Math.max(1, Math.ceil(total / pageSize));

    return {
      items: items.map((r) => this._mapRefund(r)),
      total,
      page,
      pageSize,
      totalPages,
    };
  }

  /**
   * Fetch a single refund record by ID.
   */
  async getRefundById(id: string): Promise<AdminRefundDto> {
    const refund = await this.prisma.refund.findFirst({
      where: {
        OR: [{ id }, { order_id: id }],
      },
      include: {
        order: { include: { student: true } },
        student: true,
      },
    });

    if (!refund) {
      throw new NotFoundException(`Refund not found for ID: ${id}`);
    }

    return this._mapRefund(refund);
  }

  private _mapRefund(refund: any): AdminRefundDto {
    const student = refund.student || refund.order?.student;
    const studentName = student
      ? `${student.first_name ?? ""} ${student.last_name ?? ""}`.trim() || "Student"
      : "Unknown Student";

    return {
      id: refund.id,
      orderId: refund.order_id,
      studentId: refund.student_id,
      studentName,
      amount: Math.round(Number(refund.amount)),
      reason: refund.reason,
      status: refund.status,
      requestedBy: refund.requested_by,
      reviewedBy: refund.reviewed_by ?? null,
      decisionReason: refund.decision_reason ?? null,
      payoutReference: refund.payout_reference ?? null,
      paidOutAt: refund.paid_out_at instanceof Date
        ? refund.paid_out_at.toISOString()
        : refund.paid_out_at ?? null,
      createdAt: refund.created_at instanceof Date
        ? refund.created_at.toISOString()
        : new Date(refund.created_at).toISOString(),
      updatedAt: refund.updated_at instanceof Date
        ? refund.updated_at.toISOString()
        : new Date(refund.updated_at).toISOString(),
    };
  }
}
