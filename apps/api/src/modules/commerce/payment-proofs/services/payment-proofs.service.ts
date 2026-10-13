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
import { SubmitProofDto } from "../dto";
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

    await this.auditService.log({
      actorId: adminId,
      actorRole: Role.ADMIN,
      action: "payment_proof.approved",
      targetType: "PaymentProof",
      targetId: proofId,
      metadata: { orderId: proof.order_id, durationDays },
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
      include: { order: true },
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

    await this.auditService.log({
      actorId: adminId,
      actorRole: Role.ADMIN,
      action: "payment_proof.rejected",
      targetType: "PaymentProof",
      targetId: proofId,
      metadata: { orderId: proof.order_id, rejectReason },
    });

    this.logger.log(`Proof ${proofId} rejected by admin ${adminId}: ${rejectReason}`);
  }

  // --------------------------------------------------------------------------
  // Private helpers
  // --------------------------------------------------------------------------

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
