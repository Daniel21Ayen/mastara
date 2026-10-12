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

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Lists all active products available in the catalog.
   */
  async getProducts(): Promise<ProductResponse[]> {
    const products = await this.prisma.product.findMany({
      where: { is_active: true },
      include: {
        price_rules: {
          orderBy: { tier_no: "asc" },
        },
      },
      orderBy: { created_at: "asc" },
    });

    if (products.length > 0) {
      return products.map((p) => ({
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
        priceRules: p.price_rules.map((r) => ({
          tierNo: r.tier_no,
          priceEtb: Number(r.price_etb),
        })),
      }));
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
    const products = await this.getProducts();
    const product = products.find((p) => p.id === id);
    if (!product) {
      throw new NotFoundException(`Product not found with ID ${id}`);
    }
    return product;
  }
}
