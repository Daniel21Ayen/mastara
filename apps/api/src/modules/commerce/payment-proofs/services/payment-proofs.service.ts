import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../../../../infrastructure/database/prisma.service";
import {
  EntitlementStatus,
  NotificationType,
  OrderStatus,
  PaymentMethod,
  ProofStatus,
  Role,
} from "@mastara/database";
import { isValidReference, normalizeReference, MAX_RECEIPT_BYTES } from "@mastara/domain";
import {
  AdminPaymentDto,
  PaymentDecisionDto,
  PaymentListQueryDto,
  PaymentListResultDto,
  RefundDecisionDto,
  RefundRequestDto,
  SubmitProofDto,
} from "../dto";
import { AuditService } from "../../../platform/audit/services/audit.service";
import { PushService } from "../../../../infrastructure/push/push.service";

export interface ProofResponse {
  id: string;
  orderId: string;
  method: PaymentMethod;
  transactionReference: string;
  imageKey: string;
  status: ProofStatus;
  rejectReason: string | null;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class PaymentProofsService {
  private readonly logger = new Logger(PaymentProofsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly pushService: PushService,
  ) {}

  /**
   * Attaches a payment proof receipt to an existing PENDING_PAYMENT order.
   * Validates the transaction reference format and enforces maximum receipt size.
   */
  async submitProof(
    studentId: string,
    orderId: string,
    dto: SubmitProofDto,
  ): Promise<ProofResponse> {
    // 1. Verify order ownership and status
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException(`Order not found with ID ${orderId}`);
    if (order.student_id !== studentId) {
      throw new ForbiddenException("You do not have access to this order");
    }
    if (order.status !== OrderStatus.PENDING_PAYMENT) {
      throw new ConflictException({
        errorCode: "ORDER_NOT_PENDING",
        message: "Proof can only be submitted for orders in PENDING_PAYMENT status",
      });
    }

    // 2. Check for duplicate proof on this order
    const existingProof = await this.prisma.paymentProof.findUnique({
      where: { order_id: orderId },
    });
    if (existingProof && existingProof.image_key !== "") {
      throw new ConflictException({
        errorCode: "PROOF_ALREADY_SUBMITTED",
        message: "A payment proof has already been submitted for this order",
      });
    }

    // 3. Validate reference format
    if (!isValidReference(dto.method, dto.transactionReference)) {
      throw new BadRequestException({
        errorCode: "INVALID_REFERENCE",
        message: `Transaction reference is not valid for ${dto.method}`,
      });
    }

    // 4. Validate image size
    if (dto.imageSizeBytes > MAX_RECEIPT_BYTES) {
      throw new BadRequestException({
        errorCode: "RECEIPT_TOO_LARGE",
        message: `Receipt image exceeds the maximum size of ${MAX_RECEIPT_BYTES} bytes`,
      });
    }

    // 5. Check for duplicate reference across all orders
    const dupRef = await this.prisma.paymentProof.findUnique({
      where: { transaction_reference: normalizeReference(dto.transactionReference) },
    });
    if (dupRef && dupRef.order_id !== orderId) {
      throw new ConflictException({
        errorCode: "REFERENCE_ALREADY_USED",
        message: "This transaction reference has already been used in another order",
      });
    }

    // 6. Persist proof and advance order status atomically
    const proof = await this.prisma.$transaction(async (tx) => {
      let resolvedProof;
      if (existingProof) {
        resolvedProof = await tx.paymentProof.update({
          where: { order_id: orderId },
          data: {
            method: dto.method,
            transaction_reference: normalizeReference(dto.transactionReference),
            image_key: dto.imageKey,
            image_size_bytes: dto.imageSizeBytes,
            image_mime: dto.imageMime,
            status: ProofStatus.PENDING,
          },
        });
      } else {
        resolvedProof = await tx.paymentProof.create({
          data: {
            order_id: orderId,
            method: dto.method,
            transaction_reference: normalizeReference(dto.transactionReference),
            image_key: dto.imageKey,
            image_size_bytes: dto.imageSizeBytes,
            image_mime: dto.imageMime,
            status: ProofStatus.PENDING,
          },
        });
      }

      await tx.order.update({
        where: { id: orderId },
        data: { status: OrderStatus.PAYMENT_SUBMITTED },
      });

      return resolvedProof;
    });

    await this.auditService.log({
      actorId: studentId,
      actorRole: Role.STUDENT,
      action: "payment_proof.submitted",
      targetType: "Order",
      targetId: orderId,
      metadata: { proofId: proof.id, method: dto.method },
    });

    this.logger.log(`Payment proof ${proof.id} submitted for order ${orderId}`);
    return this._mapProof(proof);
  }

  /**
   * Returns the proof attached to an order, verifying student ownership.
   */
  async getProofByOrderId(
    studentId: string,
    orderId: string,
  ): Promise<ProofResponse> {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException(`Order not found with ID ${orderId}`);
    if (order.student_id !== studentId) {
      throw new ForbiddenException("You do not have access to this order");
    }

    const proof = await this.prisma.paymentProof.findUnique({
      where: { order_id: orderId },
    });
    if (!proof) {
      throw new NotFoundException("No payment proof found for this order");
    }
    return this._mapProof(proof);
  }

  /**
   * Admin action: approves a proof and provisions entitlements for the order items.
   * Marks the order APPROVED and creates ACTIVE entitlements for each course.
   */
  async approveProof(
    adminId: string,
    proofId: string,
    durationDays: number,
  ): Promise<void> {
    const proof = await this.prisma.paymentProof.findUnique({
      where: { id: proofId },
      include: {
        order: {
          include: {
            student: true,
            items: { select: { course_id: true } },
          },
        },
      },
    });

    if (!proof) throw new NotFoundException(`Proof not found with ID ${proofId}`);
    if (proof.status !== ProofStatus.PENDING) {
      throw new ConflictException("Proof has already been reviewed");
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);

    await this.prisma.$transaction(async (tx) => {
      await tx.paymentProof.update({
        where: { id: proofId },
        data: {
          status: ProofStatus.APPROVED,
          reviewed_by: adminId,
          reviewed_at: now,
        },
      });

      await tx.order.update({
        where: { id: proof.order_id },
        data: { status: OrderStatus.APPROVED },
      });

      // Provision entitlements and active course enrollment for each course in the order
      for (const item of proof.order.items) {
        await tx.entitlement.create({
          data: {
            student_id: proof.order.student_id,
            course_id: item.course_id,
            order_id: proof.order_id,
            starts_at: now,
            expires_at: expiresAt,
            status: EntitlementStatus.ACTIVE,
          },
        });

        await tx.studentCourse.upsert({
          where: {
            student_id_course_id: {
              student_id: proof.order.student_id,
              course_id: item.course_id,
            },
          },
          update: {
            is_active: true,
            removed_at: null,
          },
          create: {
            student_id: proof.order.student_id,
            course_id: item.course_id,
            is_active: true,
          },
        });
      }

      // Fire payment approved notification
      await tx.notification.create({
        data: {
          student_id: proof.order.student_id,
          type: NotificationType.PAYMENT_APPROVED,
          title_en: "Payment Approved",
          title_am: "ክፍያ ተቀበለ",
          message_en: "Your payment has been approved and your courses are now unlocked.",
          message_am: "ክፍያዎ ተቀብሎ ኮርሶቹ ተከፍተዋል።",
          data: { orderId: proof.order_id, days: durationDays },
        },
      });
    });

    const studentName = proof.order.student
      ? `${proof.order.student.first_name} ${proof.order.student.last_name}`.trim()
      : "Student";

    await this.auditService.log({
      actorId: adminId,
      actorRole: Role.ADMIN,
      action: "PAYMENT_APPROVED",
      targetType: "PaymentProof",
      targetId: proofId,
      metadata: { target: `Order · ${studentName}`, orderId: proof.order_id, durationDays },
    });

    this.logger.log(`Proof ${proofId} approved by admin ${adminId}`);

    // Dispatch instant push notification to student
    void this.pushService.sendToStudent(proof.order.student_id, {
      title: "Payment Approved! 🎉",
      body: `Your payment has been approved and courses are open for ${durationDays} days.`,
      data: {
        type: "PAYMENT_APPROVED",
        orderId: proof.order_id,
        days: durationDays,
      },
      channelId: "payments",
    });
  }

  /**
   * Admin action: rejects a proof and returns the order to REJECTED status.
   */
  async rejectProof(
    adminId: string,
    proofId: string,
    rejectReason: string,
  ): Promise<void> {
    const proof = await this.prisma.paymentProof.findUnique({
      where: { id: proofId },
      include: {
        order: {
          include: { student: true },
        },
      },
    });

    if (!proof) throw new NotFoundException(`Proof not found with ID ${proofId}`);
    if (proof.status !== ProofStatus.PENDING) {
      throw new ConflictException("Proof has already been reviewed");
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.paymentProof.update({
        where: { id: proofId },
        data: {
          status: ProofStatus.REJECTED,
          reviewed_by: adminId,
          reviewed_at: new Date(),
          reject_reason: rejectReason,
        },
      });

      await tx.order.update({
        where: { id: proof.order_id },
        data: { status: OrderStatus.REJECTED },
      });

      // Fire payment rejected notification
      await tx.notification.create({
        data: {
          student_id: proof.order.student_id,
          type: NotificationType.PAYMENT_REJECTED,
          title_en: "Payment Rejected",
          title_am: "ክፍያ ተቀባይ ተሰርዟል",
          message_en: `Your payment proof was rejected. Reason: ${rejectReason}. Please resubmit with a valid receipt.`,
          message_am: `የክፍያ ደረሰኝዎ ተቀባይ ተሰርዟል። ምክንያት: ${rejectReason}። እባክዎ እንደገና ያስገቡ።`,
          data: { orderId: proof.order_id, reason: rejectReason, rejectReason },
        },
      });
    });

    const studentName = proof.order.student
      ? `${proof.order.student.first_name} ${proof.order.student.last_name}`.trim()
      : "Student";

    await this.auditService.log({
      actorId: adminId,
      actorRole: Role.ADMIN,
      action: "PAYMENT_REJECTED",
      targetType: "PaymentProof",
      targetId: proofId,
      metadata: { target: `Order · ${studentName}`, orderId: proof.order_id, rejectReason, reason: rejectReason },
    });

    this.logger.log(`Proof ${proofId} rejected by admin ${adminId}: ${rejectReason}`);

    // Dispatch instant push notification for payment rejection
    void this.pushService.sendToStudent(proof.order.student_id, {
      title: "Payment Rejected",
      body: `Your payment proof was rejected. Reason: ${rejectReason}. Please resubmit with a valid receipt.`,
      data: {
        type: "PAYMENT_REJECTED",
        orderId: proof.order_id,
        reason: rejectReason,
      },
      channelId: "payments",
    });
  }

  // --------------------------------------------------------------------------
  // Admin Methods
  // --------------------------------------------------------------------------

  async getAdminPayments(query: PaymentListQueryDto): Promise<PaymentListResultDto> {
    const page = Math.max(1, query.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, query.pageSize ?? 10));
    const skip = (page - 1) * pageSize;

    let statusCondition: ProofStatus = ProofStatus.PENDING;
    if (query.status === "APPROVED") {
      statusCondition = ProofStatus.APPROVED;
    } else if (query.status === "REJECTED") {
      statusCondition = ProofStatus.REJECTED;
    }

    const where: any = {
      status: statusCondition,
    };

    if (query.method) {
      where.method = query.method;
    }

    if (query.q && query.q.trim()) {
      const needle = query.q.trim();
      where.OR = [
        { transaction_reference: { contains: needle, mode: "insensitive" } },
        { id: { contains: needle, mode: "insensitive" } },
        { order_id: { contains: needle, mode: "insensitive" } },
        {
          order: {
            OR: [
              { student: { first_name: { contains: needle, mode: "insensitive" } } },
              { student: { last_name: { contains: needle, mode: "insensitive" } } },
              { student: { id: { contains: needle, mode: "insensitive" } } },
            ],
          },
        },
      ];
    }

    const [total, items, pendingCount, approvedCount, rejectedCount] = await Promise.all([
      this.prisma.paymentProof.count({ where }),
      this.prisma.paymentProof.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: [{ created_at: "desc" }, { id: "asc" }],
        include: {
          order: {
            include: {
              student: { include: { university: true } },
              product: true,
              items: { include: { course: true } },
            },
          },
        },
      }),
      this.prisma.paymentProof.count({ where: { status: ProofStatus.PENDING } }),
      this.prisma.paymentProof.count({ where: { status: ProofStatus.APPROVED } }),
      this.prisma.paymentProof.count({ where: { status: ProofStatus.REJECTED } }),
    ]);

    const refs = items.map((i) => i.transaction_reference);
    const earlierProofs =
      refs.length > 0
        ? await this.prisma.paymentProof.findMany({
            where: { transaction_reference: { in: refs } },
            select: { id: true, transaction_reference: true, created_at: true },
            orderBy: [{ created_at: "asc" }, { id: "asc" }],
          })
        : [];

    const totalPages = Math.max(1, Math.ceil(total / pageSize));

    const mappedItems = items.map((proof) => {
      const earlier = earlierProofs.find(
        (other) =>
          other.id !== proof.id &&
          other.transaction_reference === proof.transaction_reference &&
          new Date(other.created_at).getTime() < new Date(proof.created_at).getTime(),
      );
      return this._mapToAdminPayment(proof, earlier?.id ?? null);
    });

    return {
      items: mappedItems,
      total,
      page,
      pageSize,
      totalPages,
      pageCount: totalPages,
      counts: {
        pending: pendingCount,
        approved: approvedCount,
        rejected: rejectedCount,
      },
    };
  }

  async getAdminPaymentById(id: string): Promise<AdminPaymentDto> {
    const proof = await this.prisma.paymentProof.findFirst({
      where: {
        OR: [{ id }, { order_id: id }],
      },
      include: {
        order: {
          include: {
            student: { include: { university: true } },
            product: true,
            items: { include: { course: true } },
          },
        },
      },
    });

    if (!proof) {
      throw new NotFoundException(`Payment proof or order not found for ID: ${id}`);
    }

    const earlier = await this.prisma.paymentProof.findFirst({
      where: {
        transaction_reference: proof.transaction_reference,
        id: { not: proof.id },
        created_at: { lt: proof.created_at },
      },
      select: { id: true },
    });

    return this._mapToAdminPayment(proof, earlier?.id ?? null);
  }

  async decidePayment(
    adminId: string,
    id: string,
    decision: PaymentDecisionDto,
  ): Promise<AdminPaymentDto> {
    const proof = await this.prisma.paymentProof.findFirst({
      where: {
        OR: [{ id }, { order_id: id }],
      },
      include: {
        order: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!proof) {
      throw new NotFoundException(`Payment not found for ID: ${id}`);
    }

    if (proof.status !== ProofStatus.PENDING) {
      throw new ConflictException("Payment has already been decided");
    }

    if (decision.action === "APPROVE") {
      const durationDays = proof.order?.product?.duration_days ?? 120;
      await this.approveProof(adminId, proof.id, durationDays);
    } else if (decision.action === "REJECT") {
      if (!decision.reason) {
        throw new BadRequestException("Reject reason is required when rejecting a payment");
      }
      await this.rejectProof(adminId, proof.id, decision.reason);
    } else {
      throw new BadRequestException(`Unknown decision action: ${(decision as any).action}`);
    }

    return this.getAdminPaymentById(proof.id);
  }

  /**
   * Operations Admin initiates a refund request with a reason (SRS 5.5, FR-G64).
   */
  async requestRefund(
    adminId: string,
    id: string,
    dto: RefundRequestDto,
  ): Promise<{ success: boolean; status: string; orderId: string; reason: string }> {
    const proof = await this.prisma.paymentProof.findFirst({
      where: { OR: [{ id }, { order_id: id }] },
      include: { order: true },
    });

    if (!proof || !proof.order) {
      throw new NotFoundException(`Payment or order not found for ID: ${id}`);
    }

    if (proof.order.status !== OrderStatus.APPROVED) {
      throw new ConflictException("Refund can only be requested for APPROVED orders");
    }

    if ((this.prisma as any).refund) {
      await (this.prisma as any).refund
        .create({
          data: {
            order_id: proof.order.id,
            student_id: proof.order.student_id,
            amount: proof.order.quoted_amount,
            reason: dto.reason,
            status: "REQUESTED",
            requested_by: adminId,
          },
        })
        .catch(() => {});
    }

    await this.auditService.log({
      actorId: adminId,
      actorRole: Role.ADMIN,
      action: "REFUND_REQUESTED",
      targetType: "Order",
      targetId: proof.order.id,
      metadata: { reason: dto.reason, requestedBy: adminId },
    });

    return {
      success: true,
      status: "REQUESTED",
      orderId: proof.order.id,
      reason: dto.reason,
    };
  }

  /**
   * Super Admin approves or rejects refund (SRS 5.5, FR-G64).
   * Approval revokes all entitlements for the order, records payout ref, and logs audit events.
   */
  async decideRefund(
    adminId: string,
    id: string,
    dto: RefundDecisionDto,
  ): Promise<{
    success: boolean;
    status: string;
    orderId: string;
    revokedEntitlementsCount?: number;
    payoutReference?: string;
    reason?: string;
  }> {
    const proof = await this.prisma.paymentProof.findFirst({
      where: { OR: [{ id }, { order_id: id }] },
      include: {
        order: {
          include: {
            entitlements: true,
            student: true,
          },
        },
      },
    });

    if (!proof || !proof.order) {
      throw new NotFoundException(`Payment or order not found for ID: ${id}`);
    }

    if (proof.order.status !== OrderStatus.APPROVED) {
      throw new ConflictException("Refund can only be processed for APPROVED orders");
    }

    if (dto.action === "REJECT") {
      if ((this.prisma as any).refund) {
        await (this.prisma as any).refund
          .updateMany({
            where: { order_id: proof.order.id, status: "REQUESTED" },
            data: {
              status: "REJECTED",
              reviewed_by: adminId,
              decision_reason: dto.reason,
            },
          })
          .catch(() => {});
      }

      await this.auditService.log({
        actorId: adminId,
        actorRole: Role.ADMIN,
        action: "REFUND_REJECTED",
        targetType: "Order",
        targetId: proof.order.id,
        metadata: { reason: dto.reason, rejectedBy: adminId },
      });

      return {
        success: true,
        status: "REJECTED",
        orderId: proof.order.id,
        reason: dto.reason,
      };
    }

    // Approval: revoke all entitlements linked to this order, audit every step
    const payoutRef = dto.payoutReference || `MANUAL-${Date.now()}`;
    const reason = dto.reason || "Refund approved";

    await this.prisma.$transaction(async (tx) => {
      // 1. Revoke entitlements
      await tx.entitlement.updateMany({
        where: { order_id: proof.order.id },
        data: {
          status: EntitlementStatus.REVOKED,
          revoked_by: adminId,
          revoke_reason: reason,
        },
      });

      // 2. Mark order as cancelled/refunded
      await tx.order.update({
        where: { id: proof.order.id },
        data: {
          status: OrderStatus.CANCELLED,
        },
      });

      // 3. Update refund model if present in tx
      if ((tx as any).refund) {
        await (tx as any).refund.updateMany({
          where: { order_id: proof.order.id, status: "REQUESTED" },
          data: {
            status: "ENTITLEMENT_REVOKED",
            reviewed_by: adminId,
            decision_reason: reason,
            payout_reference: payoutRef,
            paid_out_at: new Date(),
          },
        }).catch(() => {});
      }
    });

    // Audit logs for refund approval and entitlement revocation
    await this.auditService.log({
      actorId: adminId,
      actorRole: Role.ADMIN,
      action: "REFUND_APPROVED",
      targetType: "Order",
      targetId: proof.order.id,
      metadata: {
        payoutReference: payoutRef,
        reason,
        studentId: proof.order.student_id,
      },
    });

    for (const ent of proof.order.entitlements) {
      await this.auditService.log({
        actorId: adminId,
        actorRole: Role.ADMIN,
        action: "ENTITLEMENT_REVOKED",
        targetType: "Entitlement",
        targetId: ent.id,
        metadata: {
          orderId: proof.order.id,
          courseId: ent.course_id,
          reason,
        },
      });
    }

    return {
      success: true,
      status: "ENTITLEMENT_REVOKED",
      orderId: proof.order.id,
      revokedEntitlementsCount: proof.order.entitlements.length,
      payoutReference: payoutRef,
      reason,
    };
  }

  // --------------------------------------------------------------------------
  // Private helpers
  // --------------------------------------------------------------------------

  private _mapToAdminPayment(proof: any, duplicateOfId: string | null = null): AdminPaymentDto {
    const order = proof.order;
    const student = order?.student;
    const product = order?.product;

    const studentName = student
      ? `${student.first_name ?? ""} ${student.last_name ?? ""}`.trim() || "Student"
      : "Unknown Student";

    const universityShortName = student?.university?.code ?? "AAU";

    let type: "BUNDLE" | "SINGLE" | "FULL_STREAM" | "FULL_BOTH" = "BUNDLE";
    if (product?.type === "SINGLE") type = "SINGLE";
    else if (product?.type === "FULL_STREAM") type = "FULL_STREAM";
    else if (product?.type === "FULL_BOTH") type = "FULL_BOTH";
    else type = "BUNDLE";

    let stream: "NATURAL" | "SOCIAL" | "BOTH" = "NATURAL";
    if (order?.stream === "SOCIAL") stream = "SOCIAL";
    else if (order?.stream === "COMMON" || product?.stream_scope === "BOTH") stream = "BOTH";
    else stream = "NATURAL";

    const courses = (order?.items ?? []).map((item: any) => ({
      courseId: item.course?.id ?? item.course_id,
      code: item.course?.code ?? "COURSE",
      title: item.course?.title_en ?? item.course?.title ?? "Course",
    }));

    let status: "PENDING" | "APPROVED" | "REJECTED" = "PENDING";
    if (proof.status === ProofStatus.APPROVED) status = "APPROVED";
    else if (proof.status === ProofStatus.REJECTED) status = "REJECTED";
    else status = "PENDING";

    let rejectReason: "MISMATCH" | "UNREADABLE" | "DUPLICATE" | null = null;
    if (
      proof.reject_reason === "MISMATCH" ||
      proof.reject_reason === "UNREADABLE" ||
      proof.reject_reason === "DUPLICATE"
    ) {
      rejectReason = proof.reject_reason;
    }

    return {
      id: proof.id,
      studentId: student?.id ?? order?.student_id ?? "",
      studentName,
      universityShortName,
      type,
      stream,
      courses,
      amount: Math.round(Number(order?.quoted_amount ?? 0)),
      method: proof.method,
      reference: proof.transaction_reference,
      status,
      rejectReason,
      createdAt:
        proof.created_at instanceof Date
          ? proof.created_at.toISOString()
          : new Date(proof.created_at).toISOString(),
      decidedAt: proof.reviewed_at
        ? proof.reviewed_at instanceof Date
          ? proof.reviewed_at.toISOString()
          : new Date(proof.reviewed_at).toISOString()
        : null,
      durationDays: product?.duration_days ?? 120,
      duplicateOf: duplicateOfId,
      imageKey: proof.image_key ?? null,
      imageUrl: proof.image_key
        ? `/api/v1/storage/file?key=${encodeURIComponent(proof.image_key)}`
        : null,
      imageMime: proof.image_mime ?? null,
      imageSizeBytes: proof.image_size_bytes ?? null,
    };
  }

  private _mapProof(proof: any): ProofResponse {
    return {
      id: proof.id,
      orderId: proof.order_id,
      method: proof.method,
      transactionReference: proof.transaction_reference,
      imageKey: proof.image_key,
      status: proof.status,
      rejectReason: proof.reject_reason ?? null,
      createdAt: proof.created_at,
      updatedAt: proof.updated_at,
    };
  }
}
