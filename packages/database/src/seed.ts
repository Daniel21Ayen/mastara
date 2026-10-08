import { PrismaClient, Role, Stream, ProductType, StreamScope, PublicationStatus } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting Mastara production seed baseline...");

  // 1. Seed System Admin
  const adminEmail = "admin@mastara.edu.et";
  const existingAdmin = await prisma.student.findUnique({ where: { email: adminEmail } });

  if (!existingAdmin) {
    // Default argon2/bcrypt hash for admin setup (can be updated on first login)
    await prisma.student.create({
      data: {
        email: adminEmail,
        phone: "+251911000000",
        password_hash: "$2b$10$EpRnTzVlqHNP0.fUbXUw3.eP28jP1l2pY7Lg0.qEw0dD2.jB1zR2C", // temporary hashed password
        role: Role.ADMIN,
        first_name: "Mastara",
        last_name: "Admin",
      },
    });
    console.log("  ✅ Admin seeded:", adminEmail);
  }

  // 2. Seed Default Products & Pricing (SRS Section 3.2)
  const products = [
    {
      type: ProductType.BUNDLE,
      stream_scope: StreamScope.ANY,
      name_en: "Semester Course Bundle",
      name_am: "የሴሚስተር ኮርስ ጥቅል",
      description_en: "Select 7 to 10 courses for the semester with full access to modules, quizzes, and exams.",
      description_am: "ለሴሚስተሩ ከ7 እስከ 10 ኮርሶችን በመምረጥ ሙሉ የሞጁሎች፣ የፈተናዎች እና የልምምድ አገልግሎት ያግኙ።",
      price_etb: 200.0,
      duration_days: 150,
      min_courses: 7,
      max_courses: 10,
    },
    {
      type: ProductType.FULL_STREAM,
      stream_scope: StreamScope.NATURAL,
      name_en: "Full Freshman Package (Natural Stream)",
      name_am: "ሙሉ የፍሬሽማን ጥቅል (የተፈጥሮ ሳይንስ)",
      description_en: "All Natural and Common stream courses for the entire freshman year including COC.",
      description_am: "የሁለቱም ሴሚስተር የተፈጥሮ እና የጋራ ኮርሶች ከነ COC ፈተና ጋር።",
      price_etb: 350.0,
      duration_days: 365,
    },
    {
      type: ProductType.FULL_STREAM,
      stream_scope: StreamScope.SOCIAL,
      name_en: "Full Freshman Package (Social Stream)",
      name_am: "ሙሉ የፍሬሽማን ጥቅል (የማህበራዊ ሳይንስ)",
      description_en: "All Social and Common stream courses for the entire freshman year including COC.",
      description_am: "የሁለቱም ሴሚስተር የማህበራዊ እና የጋራ ኮርሶች ከነ COC ፈተና ጋር።",
      price_etb: 350.0,
      duration_days: 365,
    },
    {
      type: ProductType.FULL_BOTH,
      stream_scope: StreamScope.BOTH,
      name_en: "Complete Freshman Package (Both Streams)",
      name_am: "ሁለቱም ስትሪሞች (የተፈጥሮ እና ማህበራዊ)",
      description_en: "Access to all courses from both streams for the entire academic year.",
      description_am: "ለሁለቱም ስትሪሞች ሙሉ የፍሬሽማን ዓመት አገልግሎት።",
      price_etb: 700.0,
      duration_days: 365,
    },
    {
      type: ProductType.EXTRA,
      stream_scope: StreamScope.ANY,
      name_en: "Extra Course Add-on",
      name_am: "ተጨማሪ ኮርስ",
      description_en: "Additional course beyond the bundle limit.",
      description_am: "ከጥቅሉ ገደብ በላይ ተጨማሪ ኮርስ።",
      price_etb: 100.0,
      duration_days: 150,
    },
  ];

  for (const prod of products) {
    const existing = await prisma.product.findFirst({
      where: { type: prod.type, stream_scope: prod.stream_scope },
    });
    if (!existing) {
      const created = await prisma.product.create({ data: prod });
      if (prod.type === ProductType.EXTRA) {
        // Tiered schedule: 100 ETB for 1st extra, 50 ETB for subsequent extras (SRS Section 3.2)
        await prisma.priceRule.createMany({
          data: [
            { product_id: created.id, tier_no: 1, price_etb: 100.0 },
            { product_id: created.id, tier_no: 2, price_etb: 50.0 },
          ],
        });
      }
      console.log(`  ✅ Product seeded: ${prod.name_en}`);
    }
  }

  // 3. Seed Reference Universities (SRS Section 5.10)
  const universities = [
    { code: "AASTU", name_en: "Addis Ababa Science & Technology University", name_am: "አዲስ አበባ ሳይንስና ቴክኖሎጂ ዩኒቨርሲቲ" },
    { code: "AAU", name_en: "Addis Ababa University", name_am: "አዲስ አበባ ዩኒቨርሲቲ" },
    { code: "BDU", name_en: "Bahir Dar University", name_am: "ባሕር ዳር ዩኒቨርሲቲ" },
    { code: "JU", name_en: "Jimma University", name_am: "ጅማ ዩኒቨርሲቲ" },
    { code: "MU", name_en: "Mekelle University", name_am: "መቐለ ዩኒቨርሲቲ" },
    { code: "INU", name_en: "Injibara University", name_am: "እንጅባራ ዩኒቨርሲቲ" },
  ];

  for (const [index, u] of universities.entries()) {
    await prisma.university.upsert({
      where: { code: u.code },
      update: {},
      create: {
        code: u.code,
        name_en: u.name_en,
        name_am: u.name_am,
        status: PublicationStatus.PUBLISHED,
        sort_order: index + 1,
      },
    });
  }
  console.log(`  ✅ ${universities.length} Universities verified/seeded.`);

  console.log("✨ Seed completed successfully.");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
