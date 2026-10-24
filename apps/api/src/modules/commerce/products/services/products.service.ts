import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../../../infrastructure/database/prisma.service";
import { ProductType, StreamScope } from "@mastara/database";

export interface ProductResponse {
  id: string;
  type: ProductType;
  streamScope: StreamScope;
  name: {
    en: string;
    am: string;
  };
  description?: {
    en?: string;
    am?: string;
  };
  priceEtb: number;
  durationDays: number;
  minCourses?: number;
  maxCourses?: number;
  priceRules?: {
    tierNo: number;
    priceEtb: number;
  }[];
}

import { PaginationQueryDto, PaginatedResult } from "../../../../common/pagination";

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  private mapProduct(p: any): ProductResponse {
    return {
      id: p.id,
      type: p.type,
      streamScope: p.stream_scope,
      name: {
        en: p.name_en,
        am: p.name_am,
      },
      description: {
        en: p.description_en ?? undefined,
        am: p.description_am ?? undefined,
      },
      priceEtb: Number(p.price_etb),
      durationDays: p.duration_days,
      minCourses: p.min_courses ?? undefined,
      maxCourses: p.max_courses ?? undefined,
      priceRules: p.price_rules ? p.price_rules.map((r: any) => ({
        tierNo: r.tier_no,
        priceEtb: Number(r.price_etb),
      })) : undefined,
    };
  }

  /**
   * Lists all active products available in the catalog with optional pagination.
   */
  async getProducts(
    query?: PaginationQueryDto,
  ): Promise<ProductResponse[] | PaginatedResult<ProductResponse>> {
    const orderBy: any = [{ created_at: "asc" }, { id: "asc" }];
    const where = { is_active: true };

    if (query?.page || query?.pageSize) {
      const page = Math.max(1, query.page ?? 1);
      const pageSize = Math.min(100, Math.max(1, query.pageSize ?? 10));
      const skip = (page - 1) * pageSize;
      const [total, products] = await Promise.all([
        this.prisma.product.count({ where }),
        this.prisma.product.findMany({
          where,
          include: {
            price_rules: {
              orderBy: { tier_no: "asc" },
            },
          },
          skip,
          take: pageSize,
          orderBy,
        }),
      ]);
      const items = products.map((p) => this.mapProduct(p));
      const totalPages = Math.max(1, Math.ceil(total / pageSize));
      return {
        items,
        page,
        pageSize,
        total,
        totalPages,
        pageCount: totalPages,
      };
    }

    const products = await this.prisma.product.findMany({
      where,
      include: {
        price_rules: {
          orderBy: { tier_no: "asc" },
        },
      },
      orderBy,
    });

    if (products.length > 0) {
      return products.map((p) => this.mapProduct(p));
    }

    // Default system products if not seeded in DB
    return [
      {
        id: "prod-single",
        type: ProductType.SINGLE,
        streamScope: StreamScope.ANY,
        name: { en: "Single Course", am: "ነጠላ ኮርስ" },
        description: {
          en: "Unlock 1 individual course for 150 days",
          am: "1 ነጠላ ኮርስ ለ150 ቀናት ይክፈቱ",
        },
        priceEtb: 60,
        durationDays: 150,
      },
      {
        id: "prod-bundle",
        type: ProductType.BUNDLE,
        streamScope: StreamScope.ANY,
        name: { en: "Course Bundle", am: "የኮርሶች ጥቅል" },
        description: {
          en: "Select 7 to 10 courses with tiered pricing for extras",
          am: "ከ7 እስከ 10 ኮርሶችን በተመጣጣኝ ዋጋ ይምረጡ",
        },
        priceEtb: 200,
        durationDays: 150,
        minCourses: 7,
        maxCourses: 10,
        priceRules: [
          { tierNo: 1, priceEtb: 100 },
          { tierNo: 2, priceEtb: 50 },
        ],
      },
      {
        id: "prod-full-natural",
        type: ProductType.FULL_STREAM,
        streamScope: StreamScope.NATURAL,
        name: { en: "Full Natural Package", am: "ሙሉ የተፈጥሮ ሳይንስ ጥቅል" },
        description: {
          en: "All freshman Natural Science courses for 365 days",
          am: "ሁሉንም የአንደኛ ዓመት የተፈጥሮ ሳይንስ ኮርሶች ለ365 ቀናት",
        },
        priceEtb: 350,
        durationDays: 365,
      },
      {
        id: "prod-full-social",
        type: ProductType.FULL_STREAM,
        streamScope: StreamScope.SOCIAL,
        name: { en: "Full Social Package", am: "ሙሉ የማህበራዊ ሳይንስ ጥቅል" },
        description: {
          en: "All freshman Social Science courses for 365 days",
          am: "ሁሉንም የአንደኛ ዓመት የማህበራዊ ሳይንስ ኮርሶች ለ365 ቀናት",
        },
        priceEtb: 350,
        durationDays: 365,
      },
      {
        id: "prod-full-both",
        type: ProductType.FULL_BOTH,
        streamScope: StreamScope.BOTH,
        name: { en: "Complete Both Streams Package", am: "የሁለቱም ሳይንሶች ሙሉ ጥቅል" },
        description: {
          en: "All freshman courses across both streams for 365 days",
          am: "ሁሉንም የአንደኛ ዓመት ኮርሶች ለሁለቱም ሳይንሶች ለ365 ቀናት",
        },
        priceEtb: 700,
        durationDays: 365,
      },
    ];
  }

  /**
   * Retrieves a specific product by ID.
   */
  async getProductById(id: string): Promise<ProductResponse> {
    const productsRes = await this.getProducts();
    const list = Array.isArray(productsRes) ? productsRes : productsRes.items;
    const product = list.find((p) => p.id === id);
    if (!product) {
      throw new NotFoundException(`Product not found with ID ${id}`);
    }
    return product;
  }
}
