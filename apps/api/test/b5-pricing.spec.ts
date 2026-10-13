import "reflect-metadata";
import { Test, TestingModule } from "@nestjs/testing";
import { ConfigModule } from "@nestjs/config";
import { DatabaseModule } from "../src/infrastructure/database/database.module";
import { PrismaService } from "../src/infrastructure/database/prisma.service";
import { CommerceModule } from "../src/modules/commerce/commerce.module";
import { PricingService } from "../src/modules/commerce/pricing/services/pricing.service";
import { ProductsService } from "../src/modules/commerce/products/services/products.service";
import { BadRequestException, NotFoundException } from "@nestjs/common";
import {
  EntitlementStatus,
  ProductType,
  PublicationStatus,
  Role,
  StudentStatus,
  Stream,
  StreamScope,
} from "@mastara/database";

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, details?: any) {
  if (condition) {
    console.log(`  ✓ ${testName}`);
    passed++;
  } else {
    console.error(`  ✗ ${testName}`, details || "");
    failed++;
  }
}

async function runPricingTests() {
  console.log("=== Testing Phase B5 Step 1: Products, Pricing & Store Catalog (FR-090 to FR-102, D6) ===\n");

  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [
      ConfigModule.forRoot({
        isGlobal: true,
        envFilePath: [".env", "../../.env"],
      }),
      DatabaseModule,
      CommerceModule,
    ],
  }).compile();

  const pricingService = moduleFixture.get<PricingService>(PricingService);
  const productsService = moduleFixture.get<ProductsService>(ProductsService);
  const prisma = moduleFixture.get<PrismaService>(PrismaService);

  const timestamp = Date.now();

  // ----------------------------------------------------
  // 1. Setup Academic & Course Fixtures
  // ----------------------------------------------------
  const university = await prisma.university.create({
    data: {
      name_en: "Hawassa University",
      name_am: "ሀዋሳ ዩኒቨርሲቲ",
      code: `HWU-${timestamp}`,
      status: PublicationStatus.PUBLISHED,
    },
  });

  const program = await prisma.program.create({
    data: {
      university_id: university.id,
      name_en: "Computer Science",
      name_am: "ኮምፒውተር ሳይንስ",
      code: `CS-${timestamp}`,
      status: PublicationStatus.PUBLISHED,
    },
  });

  const semester1 = await prisma.semester.create({
    data: {
      program_id: program.id,
      name_en: "Year 1 Semester 1",
      name_am: "ዓመት 1 ሴሚስተር 1",
      code: `Y1S1-${timestamp}`,
      status: PublicationStatus.PUBLISHED,
    },
  });

  const courseA = await prisma.course.create({
    data: {
      semester_id: semester1.id,
      code: `MATH101-${timestamp}`,
      title_en: "Calculus I",
      title_am: "ካልኩለስ 1",
      stream: Stream.NATURAL,
      status: PublicationStatus.PUBLISHED,
      sort_order: 1,
    },
  });

  const courseB = await prisma.course.create({
    data: {
      semester_id: semester1.id,
      code: `PHYS101-${timestamp}`,
      title_en: "General Physics",
      title_am: "አጠቃላይ ፊዚክስ",
      stream: Stream.NATURAL,
      status: PublicationStatus.PUBLISHED,
      sort_order: 2,
    },
  });

  const courseC = await prisma.course.create({
    data: {
      semester_id: semester1.id,
      code: `ENG101-${timestamp}`,
      title_en: "Communicative English",
      title_am: "ኮሙኒኬቲቭ እንግሊዝኛ",
      stream: Stream.NATURAL,
      status: PublicationStatus.PUBLISHED,
      sort_order: 3,
    },
  });

  // Test Student
  const student = await prisma.student.create({
    data: {
      first_name: "Daniel",
      last_name: "Bekele",
      phone: `+251933${String(timestamp).slice(-6)}`,
      password_hash: "secret789!",
      role: Role.STUDENT,
      status: StudentStatus.ACTIVE,
    },
  });

  // Entitlement 1: Active with 30 days left (Not within 7-day renewal window)
  const entFar = await prisma.entitlement.create({
    data: {
      student_id: student.id,
      course_id: courseA.id,
      starts_at: new Date(),
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      status: EntitlementStatus.ACTIVE,
    },
  });

  // Entitlement 2: Active with 3 days left (Within 7-day renewal window)
  const entNear = await prisma.entitlement.create({
    data: {
      student_id: student.id,
      course_id: courseB.id,
      starts_at: new Date(Date.now() - 147 * 24 * 60 * 60 * 1000),
      expires_at: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      status: EntitlementStatus.ACTIVE,
    },
  });

  let createdProductId: string | null = null;

  try {
    // ----------------------------------------------------
    // Test 1: Pricing Configuration & Defaults
    // ----------------------------------------------------
    console.log("1. Live Pricing Configuration Tests:");

    const defaultPricing = await pricingService.getPricingConfig();
    assert(
      defaultPricing.singlePrice === 60 &&
        defaultPricing.fullStreamPrice === 350 &&
        defaultPricing.fullBothPrice === 700 &&
        defaultPricing.bundle.bundlePrice === 200 &&
        defaultPricing.bundle.minCourses === 7 &&
        defaultPricing.bundle.maxCourses === 10 &&
        defaultPricing.durationDays.BUNDLE === 150 &&
        defaultPricing.durationDays.FULL_STREAM === 365,
      "Retrieves platform default pricing rules matching system requirements (60 ETB single, 200 ETB bundle 7-10)",
    );

    // ----------------------------------------------------
    // Test 2: Deposit Accounts
    // ----------------------------------------------------
    console.log("\n2. Deposit Accounts Tests:");

    const accounts = await pricingService.getAccounts();
    assert(
      Boolean(accounts.CBE_MOBILE) &&
        Boolean(accounts.CBE_BIRR) &&
        Boolean(accounts.TELEBIRR),
      "Delivers active Ethiopian deposit account numbers (CBE Mobile, CBE Birr, Telebirr)",
    );

    // ----------------------------------------------------
    // Test 3: Price Quotation Engine
    // ----------------------------------------------------
    console.log("\n3. Dynamic Quotation Engine Tests:");

    const quoteSingle = await pricingService.quote({ type: ProductType.SINGLE });
    assert(
      quoteSingle.quote.total === 60 && quoteSingle.durationDays === 150,
      "Quotes SINGLE course accurately (60 ETB, 150 days access)",
    );

    const quoteFullStream = await pricingService.quote({
      type: ProductType.FULL_STREAM,
    });
    assert(
      quoteFullStream.quote.total === 350 && quoteFullStream.durationDays === 365,
      "Quotes FULL_STREAM freshman package accurately (350 ETB, 365 days access)",
    );

    const quoteFullBoth = await pricingService.quote({
      type: ProductType.FULL_BOTH,
    });
    assert(
      quoteFullBoth.quote.total === 700 && quoteFullBoth.durationDays === 365,
      "Quotes FULL_BOTH package accurately (700 ETB, 365 days access)",
    );

    // Bundle: exactly 7 courses -> base 200 ETB
    const quoteBundle7 = await pricingService.quote({
      type: ProductType.BUNDLE,
      courseCount: 7,
    });
    assert(
      quoteBundle7.quote.total === 200 &&
        quoteBundle7.quote.lines.length === 1 &&
        quoteBundle7.quote.lines[0]?.kind === "BUNDLE" &&
        quoteBundle7.quote.lines[0]?.count === 7,
      "Quotes flat 200 ETB for 7-course bundle",
    );

    // Bundle: exactly 10 courses -> base 200 ETB
    const quoteBundle10 = await pricingService.quote({
      type: ProductType.BUNDLE,
      courseCount: 10,
    });
    assert(
      quoteBundle10.quote.total === 200 && quoteBundle10.quote.lines[0]?.count === 10,
      "Quotes flat 200 ETB for 10-course bundle",
    );

    // Bundle: 11 courses -> 200 + 100 extra = 300 ETB
    const quoteBundle11 = await pricingService.quote({
      type: ProductType.BUNDLE,
      courseCount: 11,
    });
    assert(
      quoteBundle11.quote.total === 300 &&
        quoteBundle11.quote.lines.length === 2 &&
        quoteBundle11.quote.lines[1]?.amount === 100,
      "Applies 1st extra tier (+100 ETB) for 11th course (300 ETB total)",
    );

    // Bundle: 12 courses -> 200 + 100 + 50 = 350 ETB
    const quoteBundle12 = await pricingService.quote({
      type: ProductType.BUNDLE,
      courseCount: 12,
    });
    assert(
      quoteBundle12.quote.total === 350 &&
        quoteBundle12.quote.lines.length === 3 &&
        quoteBundle12.quote.lines[2]?.amount === 50,
      "Applies 2nd extra tier (+50 ETB) for 12th course (350 ETB total)",
    );

    // Bundle invalid: fewer than 7 courses -> rejected
    let bundleInvalidRejected = false;
    try {
      await pricingService.quote({
        type: ProductType.BUNDLE,
        courseCount: 5,
      });
    } catch (err: any) {
      if (err instanceof BadRequestException) {
        const resp = err.getResponse() as any;
        bundleInvalidRejected = resp.errorCode === "BUNDLE_COUNT_INVALID";
      }
    }
    assert(
      bundleInvalidRejected,
      "Rejects bundle selection below minimum threshold (< 7 courses) with BUNDLE_COUNT_INVALID",
    );

    // ----------------------------------------------------
    // Test 4: Buyable Courses & Renewal Window
    // ----------------------------------------------------
    console.log("\n4. Buyable Courses & Renewal Eligibility Tests:");

    const buyableCourses = await pricingService.getBuyableCourses(student.id, {
      semesterId: semester1.id,
      stream: Stream.NATURAL,
    });

    const buyableA = buyableCourses.find((b) => b.course.id === courseA.id);
    const buyableB = buyableCourses.find((b) => b.course.id === courseB.id);
    const buyableC = buyableCourses.find((b) => b.course.id === courseC.id);

    assert(
      buyableCourses.length === 3,
      "Lists all published courses for student semester and stream",
    );

    assert(
      buyableA?.access === "PAID" &&
        buyableA?.daysLeft! >= 29 &&
        buyableA?.buyable === false,
      "Course with 30 days remaining is marked PAID and NOT buyable (outside 7-day renewal window)",
    );

    assert(
      buyableB?.access === "PAID" &&
        buyableB?.daysLeft! <= 4 &&
        buyableB?.buyable === true,
      "Course with 3 days remaining is marked PAID and IS buyable (within 7-day renewal window)",
    );

    assert(
      buyableC?.access === "LOCKED" &&
        buyableC?.daysLeft === undefined &&
        buyableC?.buyable === true,
      "Course without active entitlement is marked LOCKED and IS buyable",
    );

    // ----------------------------------------------------
    // Test 5: Full Package Courses Inspection
    // ----------------------------------------------------
    console.log("\n5. Full Package Unlocked Courses Tests:");

    const fullPkgCourses = await pricingService.getFullPackageCourses({
      programId: program.id,
      stream: Stream.NATURAL,
    });

    assert(
      fullPkgCourses.length === 3 &&
        fullPkgCourses.some((c) => c.id === courseA.id) &&
        fullPkgCourses.some((c) => c.id === courseB.id),
      "Returns list of all freshman courses unlocked by a full stream package",
    );

    // ----------------------------------------------------
    // Test 6: Products Catalog Service
    // ----------------------------------------------------
    console.log("\n6. Store Products Catalog Tests:");

    const products = await productsService.getProducts();
    assert(
      products.length >= 4 &&
        products.some((p) => p.type === ProductType.BUNDLE && p.priceEtb === 200) &&
        products.some((p) => p.type === ProductType.FULL_STREAM && p.priceEtb === 350) &&
        products.some((p) => p.type === ProductType.FULL_BOTH && p.priceEtb === 700),
      "Lists standard catalog products with prices, durations, and bundle tier rules",
    );

    const firstProd = products[0]!;
    const fetched = await productsService.getProductById(firstProd.id);
    assert(
      fetched.id === firstProd.id && fetched.priceEtb === firstProd.priceEtb,
      "Retrieves individual product metadata by ID",
    );
  } finally {
    // ----------------------------------------------------
    // Cleanup Fixtures
    // ----------------------------------------------------
    await prisma.entitlement.deleteMany({
      where: { id: { in: [entFar.id, entNear.id] } },
    });
    await prisma.student.delete({ where: { id: student.id } });
    await prisma.course.deleteMany({
      where: { id: { in: [courseA.id, courseB.id, courseC.id] } },
    });
    await prisma.semester.delete({ where: { id: semester1.id } });
    await prisma.program.delete({ where: { id: program.id } });
    await prisma.university.delete({ where: { id: university.id } });
  }

  console.log(`\n========================================`);
  console.log(`Results: ${passed} passed, ${failed} failed.`);
  console.log(`========================================\n`);

  await moduleFixture.close();

  if (failed > 0) {
    process.exit(1);
  }
}

runPricingTests().catch((err) => {
  console.error("Pricing integration test run failed:", err);
  process.exit(1);
});
