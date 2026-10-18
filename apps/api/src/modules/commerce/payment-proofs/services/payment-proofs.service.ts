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
  SubmitProofDto,
} from "../dto";
import { AuditService } from "../../../platform/audit/services/audit.service";

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

      // Provision entitlements for each course in the order
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
          data: { orderId: proof.order_id },
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
          data: { orderId: proof.order_id, rejectReason },
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
      metadata: { target: `Order · ${studentName}`, orderId: proof.order_id, rejectReason },
    });

    this.logger.log(`Proof ${proofId} rejected by admin ${adminId}: ${rejectReason}`);
  }

  // --------------------------------------------------------------------------
  // Admin Methods
  // --------------------------------------------------------------------------

  async getAdminPayments(query: PaymentListQueryDto): Promise<PaymentListResultDto> {
    const page = Math.max(1, query.page ?? 1);
    const pageSize = 10;
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
        orderBy: { created_at: "desc" },
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
            orderBy: { created_at: "asc" },
          })
        : [];

    const pageCount = Math.max(1, Math.ceil(total / pageSize));

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
      pageCount,
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
