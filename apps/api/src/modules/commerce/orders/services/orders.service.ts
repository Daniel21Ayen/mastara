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
  OrderStatus,
  ProductType,
  ProofStatus,
  PublicationStatus,
  Stream,
} from "@mastara/database";
import { isValidReference, normalizeReference, quoteOrder } from "@mastara/domain";
import { PricingService } from "../../pricing/services/pricing.service";
import { CreateOrderDto, GetOrdersQueryDto } from "../dto";

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
}

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly pricingService: PricingService,
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
      type: order.product?.type ?? (order.items?.[0] ? "SINGLE" : "SINGLE"),
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
    };
  }
}
