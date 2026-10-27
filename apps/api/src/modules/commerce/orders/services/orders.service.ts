import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcryptjs";
import { PrismaService } from "../../../../infrastructure/database/prisma.service";
import {
  EntitlementStatus,
  OrderStatus,
  PaymentMethod,
  ProductType,
  ProofStatus,
  PublicationStatus,
  Role,
  Stream,
} from "@mastara/database";
import {
  isValidReference,
  normalizeReference,
  quoteOrder,
  MAX_RECEIPT_BYTES,
  validateOrderEligibility,
  verifyClaimSecret,
} from "@mastara/domain";
import { PricingService } from "../../pricing/services/pricing.service";
import {
  CreateOrderDto,
  GetOrdersQueryDto,
  SubmitOrderWithLocalDto,
  PaymentSettingsDto,
} from "../dto";

export interface OrderItemBrief {
  courseId: string;
  code: string;
  title: { en: string; am: string };
  priceComponent: number;
}

export interface OrderResponse {
  id: string;
  type: ProductType;
  stream: Stream | null;
  quotedAmount: number;
  status: OrderStatus;
  items: OrderItemBrief[];
  createdAt: Date;
  updatedAt: Date;
  method?: PaymentMethod;
  reference?: string;
  durationDays?: number;
  rejectReason?: string;
}

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly pricingService: PricingService,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * Creates a new order for a student. Validates the course selection, re-quotes
   * the server-authoritative price, and stores the order atomically.
   */
  async createOrder(
    studentId: string,
    dto: CreateOrderDto,
  ): Promise<OrderResponse> {
    // 1. Validate payment reference format
    if (!isValidReference(dto.method, dto.reference)) {
      throw new BadRequestException({
        errorCode: "INVALID_REFERENCE",
        message: `Transaction reference is not valid for payment method ${dto.method}`,
      });
    }

    // 2. Ensure reference is not already used
    const existingProof = await this.prisma.paymentProof.findUnique({
      where: { transaction_reference: normalizeReference(dto.reference) },
    });
    if (existingProof) {
      throw new ConflictException({
        errorCode: "REFERENCE_ALREADY_USED",
        message: "This transaction reference has already been submitted",
      });
    }

    // 3. Validate courses exist and are published
    const courses = await this.prisma.course.findMany({
      where: {
        id: { in: dto.courseIds },
        status: PublicationStatus.PUBLISHED,
      },
      select: { id: true, code: true, title_en: true, title_am: true },
    });

    if (courses.length !== dto.courseIds.length) {
      throw new NotFoundException({
        errorCode: "COURSE_NOT_FOUND",
        message: "One or more courses could not be found or are not published",
      });
    }

    // 4. Re-quote server-authoritative price
    const config = await this.pricingService.getPricingConfig();
    let quoteInput: Parameters<typeof quoteOrder>[1];
    switch (dto.type) {
      case ProductType.BUNDLE:
        quoteInput = { type: "BUNDLE", courseCount: dto.courseIds.length };
        break;
      case ProductType.SINGLE:
        quoteInput = { type: "SINGLE" };
        break;
      case ProductType.FULL_STREAM:
        quoteInput = { type: "FULL_STREAM" };
        break;
      case ProductType.FULL_BOTH:
        quoteInput = { type: "FULL_BOTH" };
        break;
      default:
        throw new BadRequestException(`Unsupported product type: ${dto.type}`);
    }

    const quoteResult = quoteOrder(config, quoteInput);
    if (!quoteResult.ok) {
      throw new BadRequestException({
        errorCode: "BUNDLE_COUNT_INVALID",
        message: `Bundle requires between ${config.bundle.minCourses} and ${config.bundle.maxCourses} or more courses`,
      });
    }

    const quotedAmount = quoteResult.quote.total;

    // 5. Create order with items atomically
    const pricePerItem =
      dto.courseIds.length > 0
        ? Math.round((quotedAmount / dto.courseIds.length) * 100) / 100
        : 0;

    const order = await this.prisma.$transaction(async (tx) => {
      const newOrder = await tx.order.create({
        data: {
          student_id: studentId,
          product_id: await this._getOrDefaultProductId(tx, dto.type),
          stream: dto.stream,
          quoted_amount: quotedAmount,
          status: OrderStatus.PENDING_PAYMENT,
          items: {
            create: courses.map((c) => ({
              course_id: c.id,
              price_component: pricePerItem,
            })),
          },
          proof: {
            create: {
              method: dto.method,
              transaction_reference: normalizeReference(dto.reference),
              image_key: "",
              image_size_bytes: 0,
              image_mime: "",
              status: ProofStatus.PENDING,
            },
          },
        },
        include: {
          proof: true,
          product: true,
          items: {
            include: {
              course: {
                select: { id: true, code: true, title_en: true, title_am: true },
              },
            },
          },
        },
      });
      return newOrder;
    });

    this.logger.log(
      `Order ${order.id} created for student ${studentId} (${dto.type}, ${quotedAmount} ETB)`,
    );

    return this._mapOrder(order);
  }

  /**
   * Lists the authenticated student's orders, optionally filtered by status.
   */
  async getStudentOrders(
    studentId: string,
    query: GetOrdersQueryDto,
  ): Promise<OrderResponse[]> {
    const orders = await this.prisma.order.findMany({
      where: {
        student_id: studentId,
        ...(query.status ? { status: query.status } : {}),
      },
      include: {
        proof: true,
        product: true,
        items: {
          include: {
            course: {
              select: { id: true, code: true, title_en: true, title_am: true },
            },
          },
        },
      },
      orderBy: { created_at: "desc" },
    });

    return orders.map((o) => this._mapOrder(o));
  }

  /**
   * Returns details of a specific order, verifying student ownership.
   */
  async getOrderById(
    studentId: string,
    orderId: string,
  ): Promise<OrderResponse> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        proof: true,
        product: true,
        items: {
          include: {
            course: {
              select: { id: true, code: true, title_en: true, title_am: true },
            },
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException(`Order not found with ID ${orderId}`);
    }
    if (order.student_id !== studentId) {
      throw new ForbiddenException("You do not have access to this order");
    }

    return this._mapOrder(order);
  }

  // --------------------------------------------------------------------------
  // Private helpers
  // --------------------------------------------------------------------------

  private async _getOrDefaultProductId(
    tx: any,
    type: ProductType,
  ): Promise<string> {
    const product = await tx.product.findFirst({
      where: { type, is_active: true },
      select: { id: true },
    });
    if (product) return product.id;
    const defaultPrices: Record<string, number> = {
      BUNDLE: 200,
      SINGLE: 60,
      FULL_STREAM: 350,
      FULL_BOTH: 700,
      EXTRA: 100,
    };
    const fallback = await tx.product.create({
      data: {
        type,
        name_en: type.replace(/_/g, " "),
        name_am: type.replace(/_/g, " "),
        price_etb: defaultPrices[type] ?? 60,
        duration_days: 150,
      },
    });
    return fallback.id;
  }

  private _mapOrder(order: any): OrderResponse {
    return {
      id: order.id,
      type: order.product?.type ?? "SINGLE",
      stream: order.stream,
      quotedAmount: Number(order.quoted_amount),
      status: order.status,
      items: (order.items ?? []).map((item: any) => ({
        courseId: item.course_id,
        code: item.course?.code ?? "",
        title: {
          en: item.course?.title_en ?? "",
          am: item.course?.title_am ?? "",
        },
        priceComponent: Number(item.price_component),
      })),
      createdAt: order.created_at,
      updatedAt: order.updated_at,
      method: order.proof?.method,
      reference: order.proof?.transaction_reference,
      durationDays: order.product?.duration_days,
      rejectReason: order.proof?.reject_reason ?? undefined,
    };
  }

  normalizeIdentifier(identifier: string): { isEmail: boolean; normalized: string } {
    const trimmed = identifier.trim();
    if (trimmed.includes("@")) {
      return { isEmail: true, normalized: trimmed.toLowerCase() };
    }
    const clean = trimmed.replace(/[\s\-\(\)]/g, "");
    let phone = clean;
    if (clean.startsWith("+251")) {
      phone = clean;
    } else if (clean.startsWith("251")) {
      phone = `+${clean}`;
    } else if (clean.startsWith("09")) {
      phone = `+251${clean.slice(1)}`;
    } else if (clean.startsWith("9")) {
      phone = `+251${clean}`;
    }
    return { isEmail: false, normalized: phone };
  }

  /**
   * Submits an order from an unregistered local student or authenticated student with local credentials.
   * Enforces rate limiting, receipt validation, takeover protection, and purchase eligibility.
   * Requirements: REG-07, REG-10, REG-11, PUR-01..PUR-05.
   */
  async submitOrderWithLocal(
    dto: SubmitOrderWithLocalDto,
    authenticatedStudentId?: string,
  ): Promise<OrderResponse> {
    // 1. Validate receipt payload size and MIME
    if (dto.imageSizeBytes > MAX_RECEIPT_BYTES) {
      throw new BadRequestException({
        errorCode: "RECEIPT_TOO_LARGE",
        message: `Receipt image exceeds maximum size of ${MAX_RECEIPT_BYTES} bytes`,
      });
    }

    const allowedMimes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedMimes.includes(dto.imageMime.toLowerCase())) {
      throw new BadRequestException({
        errorCode: "INVALID_RECEIPT_FORMAT",
        message: "Receipt image must be a JPEG, PNG, or WebP file",
      });
    }

    // 2. Validate reference format
    if (!isValidReference(dto.method, dto.reference)) {
      throw new BadRequestException({
        errorCode: "INVALID_REFERENCE",
        message: `Transaction reference is not valid for ${dto.method}`,
      });
    }

    // 3. Ensure reference not already submitted
    const existingProof = await this.prisma.paymentProof.findUnique({
      where: { transaction_reference: normalizeReference(dto.reference) },
    });
    if (existingProof) {
      throw new ConflictException({
        errorCode: "REFERENCE_ALREADY_USED",
        message: "This transaction reference has already been submitted",
      });
    }

    // 4. Normalize identifier
    const { isEmail, normalized } = this.normalizeIdentifier(dto.identifier);

    // 5. Rate limit: cap pending orders to max 2 per phone/email
    const pendingCount = await this.prisma.order.count({
      where: {
        status: OrderStatus.PENDING_PAYMENT,
        OR: [
          ...(isEmail ? [{ pending_email: normalized }] : [{ pending_phone: normalized }]),
          { pending_email: dto.identifier.trim().toLowerCase() },
          { pending_phone: dto.identifier.trim() },
        ],
      },
    });

    if (pendingCount >= 2) {
      throw new BadRequestException({
        errorCode: "TOO_MANY_PENDING_ORDERS",
        message: "You have reached the maximum of 2 pending orders. Please wait for your previous payment to be reviewed.",
      });
    }

    // 6. Takeover Protection (REG-11):
    // If identifier already belongs to an existing paid student in the DB, require authentication!
    const existingStudent = await this.prisma.student.findFirst({
      where: {
        OR: [
          isEmail ? { email: normalized } : { phone: normalized },
          { email: dto.identifier.trim().toLowerCase() },
          { phone: dto.identifier.trim() },
        ],
      },
    });

    if (existingStudent && (!authenticatedStudentId || authenticatedStudentId !== existingStudent.id)) {
      throw new ForbiddenException({
        errorCode: "ACCOUNT_EXISTS_LOGIN_REQUIRED",
        message: "An account with this phone number or email is already registered. Please sign in to your account first before placing this order.",
      });
    }

    // 7. Check platform settings (PUR-08) & purchase eligibility (PUR-01..05)
    const settings = await this.getPaymentSettings();
    let hasActiveBundle = false;
    let bundleCourseIds: string[] = [];
    let ownedCourseIds: string[] = [];

    if (existingStudent) {
      const activeEntitlements = await this.prisma.entitlement.findMany({
        where: {
          student_id: existingStudent.id,
          status: EntitlementStatus.ACTIVE,
          expires_at: { gt: new Date() },
        },
        include: { order: { include: { product: true } } },
      });
      ownedCourseIds = activeEntitlements.map((e) => e.course_id);
      hasActiveBundle = activeEntitlements.some((e) =>
        e.order?.product?.type === "BUNDLE" ||
        e.order?.product?.type === "FULL_STREAM" ||
        e.order?.product?.type === "FULL_BOTH"
      );
      bundleCourseIds = activeEntitlements
        .filter((e) =>
          e.order?.product?.type === "BUNDLE" ||
          e.order?.product?.type === "FULL_STREAM" ||
          e.order?.product?.type === "FULL_BOTH"
        )
        .map((e) => e.course_id);
    }

    const eligibility = validateOrderEligibility({
      productType: dto.type,
      hasActiveBundle,
      isUnregisteredLocal: !existingStudent,
      courseIds: dto.courseIds,
      bundleCourseIds,
      ownedCourseIds,
      singleCoursesEnabled: settings.singleCoursesEnabled,
    });

    if (!eligibility.allowed) {
      throw new BadRequestException({
        errorCode: eligibility.reason ?? "PURCHASE_NOT_ALLOWED",
        message: eligibility.message ?? "Order eligibility check failed",
      });
    }

    // 8. Hash password for student record creation upon approval (REG-07, REG-16)
    const passwordHash = await bcrypt.hash(dto.password, 10);

    // 9. Re-quote price
    const courses = await this.prisma.course.findMany({
      where: {
        id: { in: dto.courseIds },
        status: PublicationStatus.PUBLISHED,
      },
      select: { id: true, code: true, title_en: true, title_am: true },
    });

    if (courses.length !== dto.courseIds.length) {
      throw new NotFoundException({
        errorCode: "COURSE_NOT_FOUND",
        message: "One or more courses could not be found or are not published",
      });
    }

    const config = await this.pricingService.getPricingConfig();
    let quoteInput: Parameters<typeof quoteOrder>[1];
    switch (dto.type) {
      case ProductType.BUNDLE:
        quoteInput = { type: "BUNDLE", courseCount: dto.courseIds.length };
        break;
      case ProductType.SINGLE:
        quoteInput = { type: "SINGLE" };
        break;
      case ProductType.FULL_STREAM:
        quoteInput = { type: "FULL_STREAM" };
        break;
      case ProductType.FULL_BOTH:
        quoteInput = { type: "FULL_BOTH" };
        break;
      default:
        throw new BadRequestException(`Unsupported product type: ${dto.type}`);
    }

    const quoteResult = quoteOrder(config, quoteInput);
    if (!quoteResult.ok) {
      throw new BadRequestException({
        errorCode: "INVALID_COURSE_COUNT",
        message: "Course count does not match bundle pricing requirements",
      });
    }

    const quotedAmount = quoteResult.quote.total;
    const unitPrice = courses.length > 0 ? Math.round((quotedAmount / courses.length) * 100) / 100 : 0;

    // 10. Atomically create Order and PaymentProof
    const order = await this.prisma.$transaction(async (tx) => {
      const productId = await this._getOrDefaultProductId(tx, dto.type);
      const newOrder = await tx.order.create({
        data: {
          student_id: existingStudent ? existingStudent.id : null,
          local_account_id: dto.localAccountId,
          claim_secret_hash: dto.claimSecretHash,
          pending_name: dto.fullName.trim(),
          pending_phone: !isEmail ? normalized : null,
          pending_email: isEmail ? normalized : null,
          pending_password_hash: passwordHash,
          product_id: productId,
          stream: dto.stream,
          quoted_amount: quotedAmount,
          status: OrderStatus.PENDING_PAYMENT,
          items: {
            create: dto.courseIds.map((courseId) => ({
              course_id: courseId,
              price_component: unitPrice,
            })),
          },
        },
      });

      await tx.paymentProof.create({
        data: {
          order_id: newOrder.id,
          method: dto.method,
          transaction_reference: normalizeReference(dto.reference),
          image_key: dto.imageKey,
          image_size_bytes: dto.imageSizeBytes,
          image_mime: dto.imageMime,
          status: ProofStatus.PENDING,
        },
      });

      return tx.order.findUniqueOrThrow({
        where: { id: newOrder.id },
        include: {
          product: true,
          items: { include: { course: true } },
          proof: true,
        },
      });
    });

    this.logger.log(`Order ${order.id} submitted with local account ${dto.localAccountId}`);
    return this._mapOrder(order);
  }

  /**
   * Claims an approved order presenting the client's secret.
   * Returns assigned MS code and JWT credentials.
   * Requirements: REG-10, REG-12, REG-14.
   */
  async claimOrder(
    orderId: string,
    claimSecret: string,
  ): Promise<{ studentId: string; studentCode: string; token: string; refreshToken?: string }> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { student: true },
    });

    if (!order) {
      throw new NotFoundException(`Order not found with ID ${orderId}`);
    }

    if (order.status !== OrderStatus.APPROVED) {
      throw new BadRequestException({
        errorCode: "ORDER_NOT_APPROVED",
        status: order.status,
        message: "This order has not been approved yet. Please wait for Operations Admin review.",
      });
    }

    if (!order.claim_secret_hash) {
      throw new BadRequestException({
        errorCode: "ORDER_NOT_CLAIMABLE",
        message: "This order does not use a claim secret.",
      });
    }

    if (!verifyClaimSecret(claimSecret, order.claim_secret_hash)) {
      throw new UnauthorizedException({
        errorCode: "INVALID_CLAIM_SECRET",
        message: "The presented claim secret does not match this order.",
      });
    }

    if (!order.student) {
      throw new ConflictException("Student account record has not been generated yet.");
    }

    const identifier = order.student.email || order.student.phone || "";
    const token = this.jwtService.sign({
      sub: order.student.id,
      role: order.student.role,
      identifier,
    });
    const refreshToken = this.jwtService.sign({
      sub: order.student.id,
      type: "refresh",
    });

    return {
      studentId: order.student.id,
      studentCode: order.student.student_code || "",
      token,
      refreshToken,
    };
  }

  /**
   * Retrieves platform payment settings (single courses enabled, pricing overrides).
   */
  async getPaymentSettings(): Promise<PaymentSettingsDto> {
    const setting = await this.prisma.systemSetting.findUnique({
      where: { key: "payment_settings" },
    });
    if (!setting || !setting.value || typeof setting.value !== "object") {
      return { singleCoursesEnabled: true, bundlePrices: {}, singleCoursePrices: {} };
    }
    const val = setting.value as any;
    return {
      singleCoursesEnabled: val.singleCoursesEnabled ?? true,
      bundlePrices: val.bundlePrices ?? {},
      singleCoursePrices: val.singleCoursePrices ?? {},
    };
  }

  /**
   * Updates platform payment settings (PUR-08).
   */
  async updatePaymentSettings(
    adminId: string,
    dto: PaymentSettingsDto,
  ): Promise<PaymentSettingsDto> {
    await this.prisma.systemSetting.upsert({
      where: { key: "payment_settings" },
      update: {
        value: {
          singleCoursesEnabled: dto.singleCoursesEnabled,
          bundlePrices: dto.bundlePrices ?? {},
          singleCoursePrices: dto.singleCoursePrices ?? {},
        },
        updated_by: adminId,
      },
      create: {
        key: "payment_settings",
        value: {
          singleCoursesEnabled: dto.singleCoursesEnabled,
          bundlePrices: dto.bundlePrices ?? {},
          singleCoursePrices: dto.singleCoursePrices ?? {},
        },
        description: "Payment settings: single courses enabled and price overrides",
        updated_by: adminId,
      },
    });

    return this.getPaymentSettings();
  }
}
