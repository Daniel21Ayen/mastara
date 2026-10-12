import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../../../../infrastructure/database/prisma.service";
import {
  EntitlementStatus,
  ProductType,
  PublicationStatus,
  Stream,
} from "@mastara/database";
import {
  canBuyCourse,
  DEFAULT_PRICING_CONFIG,
  DEFAULT_BUNDLE_RULES,
  quoteOrder,
  AccessState,
  OrderInput,
  OrderQuote,
  PricingConfig,
} from "@mastara/domain";
import {
  QuoteOrderDto,
  GetBuyableCoursesQueryDto,
  GetFullPackageQueryDto,
} from "../dto";

export interface AccountsResponse {
  CBE_MOBILE: string;
  CBE_BIRR: string;
  TELEBIRR: string;
}

export interface CourseBriefResponse {
  id: string;
  semesterId: string;
  code: string;
  title: {
    en: string;
    am: string;
  };
  stream: Stream;
}

export interface BuyableCourseResponse {
  course: CourseBriefResponse;
  access: AccessState;
  daysLeft?: number;
  buyable: boolean;
}

export interface QuoteOrderResponse {
  type: ProductType;
  quote: OrderQuote;
  durationDays: number;
}

@Injectable()
export class PricingService {
  private readonly logger = new Logger(PricingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Retrieves active dynamic pricing configuration from database, falling back to platform defaults.
   */
  async getPricingConfig(): Promise<PricingConfig> {
    const products = await this.prisma.product.findMany({
      where: { is_active: true },
      include: {
        price_rules: {
          orderBy: { tier_no: "asc" },
        },
      },
    });

    if (products.length === 0) {
      return DEFAULT_PRICING_CONFIG;
    }

    const bundleProduct = products.find((p) => p.type === ProductType.BUNDLE);
    const extraProduct = products.find((p) => p.type === ProductType.EXTRA);
    const singleProduct = products.find((p) => p.type === ProductType.SINGLE);
    const fullStreamProduct = products.find(
      (p) => p.type === ProductType.FULL_STREAM,
    );
    const fullBothProduct = products.find(
      (p) => p.type === ProductType.FULL_BOTH,
    );

    const bundleRulesList = bundleProduct?.price_rules ?? [];
    const extraRulesList = extraProduct?.price_rules ?? [];
    const combinedRules =
      bundleRulesList.length > 0 ? bundleRulesList : extraRulesList;

    const extraCoursePrices =
      combinedRules.length > 0
        ? combinedRules.map((r) => Number(r.price_etb))
        : DEFAULT_BUNDLE_RULES.extraCoursePrices;

    return {
      bundle: {
        bundlePrice: bundleProduct
          ? Number(bundleProduct.price_etb)
          : DEFAULT_BUNDLE_RULES.bundlePrice,
        minCourses: bundleProduct?.min_courses ?? DEFAULT_BUNDLE_RULES.minCourses,
        maxCourses: bundleProduct?.max_courses ?? DEFAULT_BUNDLE_RULES.maxCourses,
        extraCoursePrices,
      },
      singlePrice: singleProduct
        ? Number(singleProduct.price_etb)
        : DEFAULT_PRICING_CONFIG.singlePrice,
      fullStreamPrice: fullStreamProduct
        ? Number(fullStreamProduct.price_etb)
        : DEFAULT_PRICING_CONFIG.fullStreamPrice,
      fullBothPrice: fullBothProduct
        ? Number(fullBothProduct.price_etb)
        : DEFAULT_PRICING_CONFIG.fullBothPrice,
      durationDays: {
        BUNDLE:
          bundleProduct?.duration_days ??
          DEFAULT_PRICING_CONFIG.durationDays.BUNDLE,
        SINGLE:
          singleProduct?.duration_days ??
          DEFAULT_PRICING_CONFIG.durationDays.SINGLE,
        FULL_STREAM:
          fullStreamProduct?.duration_days ??
          DEFAULT_PRICING_CONFIG.durationDays.FULL_STREAM,
        FULL_BOTH:
          fullBothProduct?.duration_days ??
          DEFAULT_PRICING_CONFIG.durationDays.FULL_BOTH,
      },
    };
  }

  /**
   * Retrieves designated deposit account numbers for Ethiopian payment options.
   */
  async getAccounts(): Promise<AccountsResponse> {
    return {
      CBE_MOBILE: this.configService.get<string>(
        "PAYMENT_ACCOUNT_CBE_MOBILE",
        "1000123456789",
      ),
      CBE_BIRR: this.configService.get<string>(
        "PAYMENT_ACCOUNT_CBE_BIRR",
        "0911223344",
      ),
      TELEBIRR: this.configService.get<string>(
        "PAYMENT_ACCOUNT_TELEBIRR",
        "0911223344",
      ),
    };
  }

  /**
   * Calculates a dynamic, server-authoritative price quote for any product and bundle selection.
   */
  async quote(dto: QuoteOrderDto): Promise<QuoteOrderResponse> {
    const config = await this.getPricingConfig();

    let input: OrderInput;
    switch (dto.type) {
      case ProductType.BUNDLE:
        input = {
          type: "BUNDLE",
          courseCount: dto.courseCount ?? 0,
        };
        break;
      case ProductType.SINGLE:
        input = { type: "SINGLE" };
        break;
      case ProductType.FULL_STREAM:
        input = { type: "FULL_STREAM" };
        break;
      case ProductType.FULL_BOTH:
        input = { type: "FULL_BOTH" };
        break;
      default:
        throw new BadRequestException(`Unsupported quote product type: ${dto.type}`);
    }

    const quoteResult = quoteOrder(config, input);

    if (!quoteResult.ok) {
      throw new BadRequestException({
        errorCode: "BUNDLE_COUNT_INVALID",
        message: `Bundle requires between ${config.bundle.minCourses} and ${config.bundle.maxCourses} or more courses`,
      });
    }

    const durationDays =
      dto.type === ProductType.BUNDLE
        ? config.durationDays.BUNDLE
        : dto.type === ProductType.SINGLE
          ? config.durationDays.SINGLE
          : dto.type === ProductType.FULL_STREAM
            ? config.durationDays.FULL_STREAM
            : config.durationDays.FULL_BOTH;

    return {
      type: dto.type,
      quote: quoteResult.quote,
      durationDays,
    };
  }

  /**
   * Retrieves courses of a semester for the student's stream with ownership status and renewal eligibility.
   */
  async getBuyableCourses(
    studentId: string,
    query: GetBuyableCoursesQueryDto,
  ): Promise<BuyableCourseResponse[]> {
    const semester = await this.prisma.semester.findUnique({
      where: { id: query.semesterId },
      select: { id: true },
    });

    if (!semester) {
      throw new NotFoundException(
        `Semester not found with ID ${query.semesterId}`,
      );
    }

    const courses = await this.prisma.course.findMany({
      where: {
        semester_id: query.semesterId,
        stream: query.stream,
        status: PublicationStatus.PUBLISHED,
      },
      orderBy: { sort_order: "asc" },
    });

    if (courses.length === 0) {
      return [];
    }

    const now = new Date();
    const activeEntitlements = await this.prisma.entitlement.findMany({
      where: {
        student_id: studentId,
        course_id: { in: courses.map((c) => c.id) },
        status: EntitlementStatus.ACTIVE,
        expires_at: { gt: now },
      },
    });

    const entitlementMap = new Map(
      activeEntitlements.map((e) => [e.course_id, e]),
    );

    return courses.map((c) => {
      const ent = entitlementMap.get(c.id);
      let access: AccessState = "LOCKED";
      let daysLeft: number | undefined = undefined;

      if (ent) {
        access = "PAID";
        daysLeft = Math.max(
          0,
          Math.ceil(
            (ent.expires_at.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
          ),
        );
      }

      const buyable = canBuyCourse(access, daysLeft);

      return {
        course: {
          id: c.id,
          semesterId: c.semester_id,
          code: c.code,
          title: {
            en: c.title_en,
            am: c.title_am,
          },
          stream: c.stream,
        },
        access,
        daysLeft,
        buyable,
      };
    });
  }

  /**
   * Retrieves all freshman courses unlocked by a full package for a program.
   */
  async getFullPackageCourses(
    query: GetFullPackageQueryDto,
  ): Promise<CourseBriefResponse[]> {
    const program = await this.prisma.program.findUnique({
      where: { id: query.programId },
      select: { id: true },
    });

    if (!program) {
      throw new NotFoundException(
        `Program not found with ID ${query.programId}`,
      );
    }

    const courses = await this.prisma.course.findMany({
      where: {
        semester: {
          program_id: query.programId,
        },
        stream: query.stream,
        status: PublicationStatus.PUBLISHED,
      },
      orderBy: [
        { semester: { code: "asc" } },
        { sort_order: "asc" },
      ],
    });

    return courses.map((c) => ({
      id: c.id,
      semesterId: c.semester_id,
      code: c.code,
      title: {
        en: c.title_en,
        am: c.title_am,
      },
      stream: c.stream,
    }));
  }
}
