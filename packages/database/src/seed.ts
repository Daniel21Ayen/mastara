import {
  Role,
  Stream,
  ProductType,
  StreamScope,
  PublicationStatus,
  QuestionType,
  Difficulty,
  ExamKind,
  EntitlementStatus,
  OrderStatus,
  PaymentMethod,
  ProofStatus,
  TicketStatus,
  StudentStatus,
  DevicePlatform,
  DeviceBindingStatus,
  NotificationType,
  ScanJobStatus,
  DocumentStatus,
  AttemptCategory,
  AttemptState,
  ContentKind,
} from "@prisma/client";
import { prisma } from "./client";

async function main() {
  if (process.env.NODE_ENV === "production" && process.env.ALLOW_PROD_SEED !== "true") {
    console.error("🛑 FATAL: Database seeding with default dev passwords is blocked in PRODUCTION.");
    console.error("To seed in production, set ALLOW_PROD_SEED=true and supply custom hashed credentials via env.");
    process.exit(1);
  }

  console.log("🌱 Starting Comprehensive Mastara Seed Enrichment for All System Pages...\n");

  // ==========================================================================
  // 1. System Users (Admin Accounts & Demo Students)
  // ==========================================================================
  console.log("--- 1. Seeding Admin & Student Users ---");

  // Primary demo admin account: admin@mastara.demo with password admin123
  const adminDemo = await prisma.student.upsert({
    where: { email: "admin@mastara.demo" },
    update: {
      role: Role.ADMIN,
      status: StudentStatus.ACTIVE,
      password_hash: "$2a$10$vbgVTEGmVV/vCOd/rn7RXe5OfcQc.Wan.DREeVSbdxJuZNHpYFw2W", // admin123
    },
    create: {
      email: "admin@mastara.demo",
      phone: "+251911000001",
      password_hash: "$2a$10$vbgVTEGmVV/vCOd/rn7RXe5OfcQc.Wan.DREeVSbdxJuZNHpYFw2W", // admin123
      role: Role.ADMIN,
      status: StudentStatus.ACTIVE,
      first_name: "Mastara",
      last_name: "Admin",
    },
  });
  console.log("  ✅ Demo admin verified: admin@mastara.demo (admin123 / password123)");

  // Super admin account: admin@mastara.edu.et with password password123
  const adminEdu = await prisma.student.upsert({
    where: { email: "admin@mastara.edu.et" },
    update: {
      role: Role.ADMIN,
      status: StudentStatus.ACTIVE,
      password_hash: "$2a$10$qeC6ZERtYEg1QXVNhUKxNu9OAlnhsv6MduYJ8z5ngJIiQC3OEOnmq", // password123
    },
    create: {
      email: "admin@mastara.edu.et",
      phone: "+251911000000",
      password_hash: "$2a$10$qeC6ZERtYEg1QXVNhUKxNu9OAlnhsv6MduYJ8z5ngJIiQC3OEOnmq", // password123
      role: Role.ADMIN,
      status: StudentStatus.ACTIVE,
      first_name: "Mastara",
      last_name: "Super Admin",
    },
  });
  console.log("  ✅ Enterprise admin verified: admin@mastara.edu.et");

  // ==========================================================================
  // 2. Universities (All 6 National Public Universities)
  // ==========================================================================
  console.log("\n--- 2. Seeding Universities ---");
  const universitiesData = [
    { code: "AASTU", name_en: "Addis Ababa Science and Technology University", name_am: "አዲስ አበባ ሳይንስና ቴክኖሎጂ ዩኒቨርሲቲ" },
    { code: "AAU", name_en: "Addis Ababa University", name_am: "አዲስ አበባ ዩኒቨርሲቲ" },
    { code: "BDU", name_en: "Bahir Dar University", name_am: "ባሕር ዳር ዩኒቨርሲቲ" },
    { code: "JU", name_en: "Jimma University", name_am: "ጅማ ዩኒቨርሲቲ" },
    { code: "MU", name_en: "Mekelle University", name_am: "መቐለ ዩኒቨርሲቲ" },
    { code: "INU", name_en: "Injibara University", name_am: "እንጅባራ ዩኒቨርሲቲ" },
  ];

  const univMap = new Map<string, string>();
  for (const [index, u] of universitiesData.entries()) {
    const record = await prisma.university.upsert({
      where: { code: u.code },
      update: { name_en: u.name_en, name_am: u.name_am, status: PublicationStatus.PUBLISHED },
      create: {
        code: u.code,
        name_en: u.name_en,
        name_am: u.name_am,
        status: PublicationStatus.PUBLISHED,
        sort_order: index + 1,
      },
    });
    univMap.set(u.code, record.id);
  }
  console.log(`  ✅ ${univMap.size} Universities synchronized.`);

  // ==========================================================================
  // 3. Academic Programs & Semesters
  // ==========================================================================
  console.log("\n--- 3. Seeding Academic Programs & Semesters ---");
  const programsData = [
    { univCode: "AASTU", code: "SE", name_en: "Software Engineering", name_am: "ሶፍትዌር ኢንጂነሪንግ" },
    { univCode: "AASTU", code: "CE", name_en: "Civil Engineering", name_am: "ሲቪል ኢንጂነሪንግ" },
    { univCode: "AAU", code: "PRE", name_en: "Pre-Engineering & Natural Science", name_am: "የቅድመ-ምህንድስናና የተፈጥሮ ሳይንስ" },
    { univCode: "AAU", code: "SOC", name_en: "Social Science & Humanities", name_am: "የማህበራዊ ሳይንስና ስነ-ሰብዕ" },
    { univCode: "BDU", code: "CS", name_en: "Computer Science", name_am: "ኮምፒውተር ሳይንስ" },
    { univCode: "BDU", code: "ACC", name_en: "Accounting & Finance", name_am: "አካውንቲንግና ፋይናንስ" },
    { univCode: "JU", code: "MED", name_en: "Medicine & Health Sciences", name_am: "ህክምናና ጤና ሳይንስ" },
    { univCode: "JU", code: "ECO", name_en: "Economics & Management", name_am: "ኢኮኖሚክስና ማኔጅመንት" },
    { univCode: "MU", code: "LAW", name_en: "Law & Governance", name_am: "ህግና አስተዳደር" },
    { univCode: "INU", code: "REM", name_en: "Freshman Remedial Program", name_am: "የፍሬሽማን ሬሜዲያል ፕሮግራም" },
  ];

  const semesterMap = new Map<string, string>();
  let defaultSemesterId = "";
  const programMap = new Map<string, string>();

  for (const p of programsData) {
    const universityId = univMap.get(p.univCode);
    if (!universityId) continue;

    const prog = await prisma.program.upsert({
      where: { university_id_code: { university_id: universityId, code: p.code } },
      update: { name_en: p.name_en, name_am: p.name_am, status: PublicationStatus.PUBLISHED },
      create: {
        university_id: universityId,
        code: p.code,
        name_en: p.name_en,
        name_am: p.name_am,
        status: PublicationStatus.PUBLISHED,
      },
    });
    programMap.set(`${p.univCode}_${p.code}`, prog.id);

    for (const semNum of [1, 2]) {
      const semCode = `S${semNum}`;
      const sem = await prisma.semester.upsert({
        where: { program_id_code: { program_id: prog.id, code: semCode } },
        update: {},
        create: {
          program_id: prog.id,
          code: semCode,
          name_en: `Semester ${semNum}`,
          name_am: `ሴሚስተር ${semNum}`,
          status: PublicationStatus.PUBLISHED,
          sort_order: semNum,
        },
      });
      semesterMap.set(`${prog.id}_${semCode}`, sem.id);
      if (!defaultSemesterId && semNum === 1) defaultSemesterId = sem.id;
    }
  }
  console.log(`  ✅ ${programsData.length} Programs & Semesters seeded.`);

  // ==========================================================================
  // 4. Diverse Students & Device Lock Fingerprints (/students page)
  // ==========================================================================
  console.log("\n--- 4. Seeding Diverse Students & Device Bindings ---");
  const aastuId = univMap.get("AASTU");
  const aauId = univMap.get("AAU");
  const bduId = univMap.get("BDU");
  const juId = univMap.get("JU");
  const muId = univMap.get("MU");
  const inuId = univMap.get("INU");

  const studentSeeds = [
    {
      email: "student@mastara.edu.et",
      phone: "+251911223344",
      firstName: "Abebe",
      lastName: "Kebede",
      stream: Stream.NATURAL,
      univId: aastuId,
      device: { name: "Samsung Galaxy A54", platform: DevicePlatform.ANDROID, status: DeviceBindingStatus.ACTIVE, hash: "hw_fp_samsung_a54_01" },
    },
    {
      email: "chaltu@mastara.edu.et",
      phone: "+251922334455",
      firstName: "Chaltu",
      lastName: "Desta",
      stream: Stream.NATURAL,
      univId: aauId,
      device: { name: "Tecno Spark 10 Pro", platform: DevicePlatform.ANDROID, status: DeviceBindingStatus.ACTIVE, hash: "hw_fp_tecno_spark10_02" },
    },
    {
      email: "yared@mastara.edu.et",
      phone: "+251933445566",
      firstName: "Yared",
      lastName: "Tadesse",
      stream: Stream.SOCIAL,
      univId: bduId,
      device: { name: "Xiaomi Redmi Note 12", platform: DevicePlatform.ANDROID, status: DeviceBindingStatus.ACTIVE, hash: "hw_fp_redmi_note12_03" },
    },
    {
      email: "tigist@mastara.edu.et",
      phone: "+251944556677",
      firstName: "Tigist",
      lastName: "Alemu",
      stream: Stream.SOCIAL,
      univId: juId,
      device: { name: "iPhone 13", platform: DevicePlatform.IOS, status: DeviceBindingStatus.RELEASED, hash: "hw_fp_iphone13_04" },
    },
    {
      email: "dawit@mastara.edu.et",
      phone: "+251955667788",
      firstName: "Dawit",
      lastName: "Haile",
      stream: Stream.NATURAL,
      univId: muId,
      device: { name: "Infinix Hot 30", platform: DevicePlatform.ANDROID, status: DeviceBindingStatus.REVOKED, hash: "hw_fp_infinix_hot30_05" },
    },
    {
      email: "bethlehem@mastara.edu.et",
      phone: "+251966778899",
      firstName: "Bethlehem",
      lastName: "Assefa",
      stream: Stream.NATURAL,
      univId: inuId,
      device: { name: "Realme C55", platform: DevicePlatform.ANDROID, status: DeviceBindingStatus.ACTIVE, hash: "hw_fp_realme_c55_06" },
    },
    {
      email: "henok@mastara.edu.et",
      phone: "+251977889900",
      firstName: "Henok",
      lastName: "Girma",
      stream: Stream.SOCIAL,
      univId: aastuId,
      device: { name: "Samsung Galaxy S22", platform: DevicePlatform.ANDROID, status: DeviceBindingStatus.ACTIVE, hash: "hw_fp_samsung_s22_07" },
    },
    {
      email: "selamawit@mastara.edu.et",
      phone: "+251988990011",
      firstName: "Selamawit",
      lastName: "Bekele",
      stream: Stream.NATURAL,
      univId: aauId,
      device: { name: "iPhone 14 Pro", platform: DevicePlatform.IOS, status: DeviceBindingStatus.ACTIVE, hash: "hw_fp_iphone14_08" },
    },
  ];

  const studentMap = new Map<string, any>();
  for (const [idx, s] of studentSeeds.entries()) {
    const studentCode = `MS${(idx + 1).toString().padStart(4, '0')}`;
    const studentRecord = await prisma.student.upsert({
      where: { email: s.email },
      update: {
        student_code: studentCode,
        first_name: s.firstName,
        last_name: s.lastName,
        stream_pref: s.stream,
        university_id: s.univId,
        profile_completed_at: new Date(),
      },
      create: {
        student_code: studentCode,
        email: s.email,
        phone: s.phone,
        password_hash: "$2a$10$qeC6ZERtYEg1QXVNhUKxNu9OAlnhsv6MduYJ8z5ngJIiQC3OEOnmq", // password123
        role: Role.STUDENT,
        status: StudentStatus.ACTIVE,
        first_name: s.firstName,
        last_name: s.lastName,
        stream_pref: s.stream,
        university_id: s.univId,
        profile_completed_at: new Date(),
      },
    });
    studentMap.set(s.email, studentRecord);

    // Device binding
    await prisma.deviceBinding.upsert({
      where: { student_id: studentRecord.id },
      update: {
        device_name: s.device.name,
        platform: s.device.platform,
        status: s.device.status,
      },
      create: {
        student_id: studentRecord.id,
        device_id_hash: s.device.hash,
        device_name: s.device.name,
        platform: s.device.platform,
        status: s.device.status,
      },
    });
  }
  console.log(`  ✅ ${studentSeeds.length} Students & Hardware Device Bindings seeded.`);

  // ==========================================================================
  // 5. Complete Academic Catalog Courses (18 Courses)
  // ==========================================================================
  console.log("\n--- 5. Seeding Full Academic Catalog (18 Courses) ---");
  const coursesTemplates = [
    // Semester 1
    { semNum: 1, code: "ENG101", title_en: "Communicative English Language Skills", title_am: "ኮሚዩኒኬቲቭ እንግሊዝኛ", stream: Stream.COMMON },
    { semNum: 1, code: "LOG101", title_en: "Logic and Critical Thinking", title_am: "ሎጂክ እና ሂሳዊ አስተሳሰብ", stream: Stream.COMMON },
    { semNum: 1, code: "CIV101", title_en: "Civics and Ethical Education", title_am: "ሲቪክስ እና ስነምግባር", stream: Stream.COMMON },
    { semNum: 1, code: "MAT101", title_en: "Calculus I (Applied Mathematics I)", title_am: "ካልኩለስ 1 (የተግባራዊ ሂሳብ)", stream: Stream.NATURAL },
    { semNum: 1, code: "PHY101", title_en: "General Physics", title_am: "አጠቃላይ ፊዚክስ", stream: Stream.NATURAL },
    { semNum: 1, code: "CHE101", title_en: "General Chemistry", title_am: "አጠቃላይ ኬሚስትሪ", stream: Stream.NATURAL },
    { semNum: 1, code: "GEO101", title_en: "Geography of Ethiopia and the Horn", title_am: "የኢትዮጵያና የቀንድ አፍሪካ ጂኦግራፊ", stream: Stream.SOCIAL },
    { semNum: 1, code: "HIS101", title_en: "History of Ethiopia and the Horn", title_am: "የኢትዮጵያና የቀንድ አፍሪካ ታሪክ", stream: Stream.SOCIAL },
    { semNum: 1, code: "ECO101", title_en: "Introduction to Economics", title_am: "የኢኮኖሚክስ መግቢያ", stream: Stream.SOCIAL },
    // Semester 2
    { semNum: 2, code: "ENG102", title_en: "Basic Writing Skills", title_am: "መሰረታዊ የፅሁፍ ክህሎት", stream: Stream.COMMON },
    { semNum: 2, code: "ANT102", title_en: "Social Anthropology", title_am: "ማህበራዊ አንትሮፖሎጂ", stream: Stream.COMMON },
    { semNum: 2, code: "FIT102", title_en: "Physical Fitness and Health", title_am: "አካላዊ ብቃትና ጤና", stream: Stream.COMMON },
    { semNum: 2, code: "MAT102", title_en: "Calculus II (Applied Mathematics II)", title_am: "ካልኩለስ 2", stream: Stream.NATURAL },
    { semNum: 2, code: "BIO102", title_en: "General Biology", title_am: "አጠቃላይ ባዮሎጂ", stream: Stream.NATURAL },
    { semNum: 2, code: "PHY102", title_en: "Mechanics and Heat", title_am: "ሜካኒክስ እና ሙቀት", stream: Stream.NATURAL },
    { semNum: 2, code: "MAT112", title_en: "Mathematics for Social Sciences", title_am: "ሂሳብ ለማህበራዊ ሳይንስ", stream: Stream.SOCIAL },
    { semNum: 2, code: "PSY102", title_en: "Introduction to Psychology", title_am: "የስነ-ልቦና መግቢያ", stream: Stream.SOCIAL },
    { semNum: 2, code: "GEO102", title_en: "Introduction to Human Geography", title_am: "የሰው ልጅ ጂኦግራፊ መግቢያ", stream: Stream.SOCIAL },
  ];

  const seededCourses: any[] = [];
  for (const c of coursesTemplates) {
    const courseRecord = await prisma.course.upsert({
      where: { semester_id_code: { semester_id: defaultSemesterId, code: c.code } },
      update: {
        title_en: c.title_en,
        title_am: c.title_am,
        stream: c.stream,
        status: PublicationStatus.PUBLISHED,
      },
      create: {
        semester_id: defaultSemesterId,
        code: c.code,
        title_en: c.title_en,
        title_am: c.title_am,
        stream: c.stream,
        status: PublicationStatus.PUBLISHED,
        is_promotional: c.code === "ENG101" || c.code === "LOG101" || c.code === "MAT101",
      },
    });
    seededCourses.push(courseRecord);
  }
  console.log(`  ✅ ${seededCourses.length} Catalog Courses synchronized.`);

  // ==========================================================================
  // 6. Content Modules, Topics, and Bilingual STEM with Math
  // ==========================================================================
  console.log("\n--- 6. Seeding Content Modules, Notes & KaTeX Math ---");
  for (const [modIdx, course] of seededCourses.entries()) {
    const moduleCode = `MOD-${modIdx + 1}`;
    const mod = await prisma.module.upsert({
      where: { course_id_code: { course_id: course.id, code: moduleCode } },
      update: {
        title_en: `${course.title_en} - Core Module`,
        title_am: `${course.title_en} - ዋና ሞጁል`,
        status: PublicationStatus.PUBLISHED,
      },
      create: {
        course_id: course.id,
        code: moduleCode,
        title_en: `${course.title_en} - Core Module`,
        title_am: `${course.title_en} - ዋና ሞጁል`,
        description_en: `Comprehensive curriculum module covering theoretical and applied fundamentals of ${course.title_en}.`,
        description_am: `የ${course.title_en} ዋና ዋና ፅንሰ ሀሳቦችን እና የተግባር ትምህርቶችን የያዘ ሞጁል።`,
        is_free_trial: modIdx < 3,
        status: PublicationStatus.PUBLISHED,
        sort_order: 1,
      },
    });

    for (let chNum = 1; chNum <= 3; chNum++) {
      const isFree = chNum === 1 || mod.is_free_trial;
      const topic = await prisma.topic.upsert({
        where: { module_id_chapter_number: { module_id: mod.id, chapter_number: chNum } },
        update: { is_free_trial: isFree },
        create: {
          module_id: mod.id,
          chapter_number: chNum,
          title_en: `Chapter ${chNum}: Key Principles of ${course.title_en}`,
          title_am: `ምዕራፍ ${chNum}: የ${course.title_en} ዋና መርሆዎች`,
          is_free_trial: isFree,
          sort_order: chNum,
        },
      });

      // Bilingual STEM Notes (English Note and separate Amharic Note per SRS)
      await prisma.content.upsert({
        where: { topic_id_kind_version: { topic_id: topic.id, kind: ContentKind.NOTE, version: 1 } },
        update: {},
        create: {
          topic_id: topic.id,
          kind: ContentKind.NOTE,
          version: 1,
          status: PublicationStatus.PUBLISHED,
          title: `Chapter ${chNum} Study Notes & Formulations`,
          title_en: `Chapter ${chNum} Study Notes & Formulations`,
          body: `### ${course.title_en} · Chapter ${chNum}\n\nIn this section, we formulate key theorems and models.\n\n$$\\lim_{x \\to 0} \\frac{\\sin x}{x} = 1 \\quad \\text{and} \\quad \\int_a^b f'(x)dx = f(b) - f(a)$$\n\nFurther, for kinetic relationships, $E_k = \\frac{1}{2}mv^2$ and $P(A \\cup B) = P(A) + P(B) - P(A \\cap B)$. Review all worked examples before attempting the chapter quiz.`,
          is_free_trial: isFree,
          published_at: new Date(),
        },
      });

      await prisma.content.upsert({
        where: { topic_id_kind_version: { topic_id: topic.id, kind: ContentKind.AMHARIC_NOTE, version: 1 } },
        update: {},
        create: {
          topic_id: topic.id,
          kind: ContentKind.AMHARIC_NOTE,
          version: 1,
          status: PublicationStatus.PUBLISHED,
          title: `የምዕራፍ ${chNum} የጥናት ማስታወሻዎች እና ስሌቶች`,
          body: `### ${course.title_en} · ምዕራፍ ${chNum}\n\nበዚህ ክፍል ዋና ዋና ቲዎረሞችን እና ቀመሮችን እንመረምራለን።\n\n$$\\lim_{x \\to 0} \\frac{\\sin x}{x} = 1 \\quad \\text{እና} \\quad \\int_a^b f'(x)dx = f(b) - f(a)$$\n\nእንዲሁም ለኃይል ግንኙነቶች $E_k = \\frac{1}{2}mv^2$ ይሆናል። ጥያቄዎችን ከመስራትዎ በፊት ምሳሌዎችን ይከልሱ።`,
          is_free_trial: isFree,
          published_at: new Date(),
        },
      });

      // Seed Student Reading Progress for demo student
      const abebe = studentMap.get("student@mastara.edu.et");
      if (abebe) {
        await prisma.readingProgress.upsert({
          where: { student_id_topic_id: { student_id: abebe.id, topic_id: topic.id } },
          update: {},
          create: {
            student_id: abebe.id,
            topic_id: topic.id,
            scroll_position: chNum === 1 ? 750 : 200,
            is_completed: chNum === 1,
            completed_at: chNum === 1 ? new Date() : null,
          },
        });
      }
    }
  }
  console.log(`  ✅ Modules, Topics, Notes, and Student Reading Progress seeded.`);

  // ==========================================================================
  // 7. Assessment Question Bank (/content/tests, /questions)
  // ==========================================================================
  console.log("\n--- 7. Seeding Assessment Question Bank & Verification ---");
  let questionCount = 0;
  for (const [cIdx, course] of seededCourses.slice(0, 8).entries()) {
    for (const quizNo of [1, 2, 3]) {
      for (let chIdx = 1; chIdx <= 2; chIdx++) {
        const chapterNumber = (quizNo - 1) * 2 + chIdx;
        const isFree = chapterNumber === 1;

        await prisma.quizChapter.upsert({
          where: { course_id_quiz_no_chapter_number: { course_id: course.id, quiz_no: quizNo, chapter_number: chapterNumber } },
          update: {},
          create: {
            course_id: course.id,
            quiz_no: quizNo,
            chapter_number: chapterNumber,
            is_free_trial: isFree,
          },
        });

        for (let q = 1; q <= 4; q++) {
          const isTF = q === 1;
          const qType = isTF ? QuestionType.TRUE_FALSE : QuestionType.SINGLE_CHOICE;
          const options = isTF
            ? [
                { id: "true", label: { en: "True", am: "እውነት" } },
                { id: "false", label: { en: "False", am: "ሐሰት" } },
              ]
            : [
                { id: "a", label: { en: `Standard formulation of Theorem #${q}`, am: `የቲዎረም #${q} መደበኛ ቀመር` } },
                { id: "b", label: { en: `Alternative inverse condition`, am: `ተቃራኒ ሁነታ` } },
                { id: "c", label: { en: `Asymptotic boundary case`, am: `የገደብ ሁኔታ` } },
                { id: "d", label: { en: `None of the above`, am: `ከላይ የተገለጹት አይደሉም` } },
              ];

          await prisma.question.create({
            data: {
              course_id: course.id,
              type: qType,
              prompt_en: `Consider the fundamental properties in ${course.title_en} (Chapter ${chapterNumber}). Which statement is mathematically valid?`,
              prompt_am: `በ${course.title_en} (ምዕራፍ ${chapterNumber}) ውስጥ ያሉትን መርሆዎች በተመለከተ፡ የትኛው አገላለጽ ትክክል ነው?`,
              explanation_en: `According to standard syllabus proofs, the theorem guarantees continuity and differentiability under specified hypotheses.`,
              explanation_am: `በትምህርት መርሃግብሩ መሰረት፡ ቲዎረሙ በቀረቡት ቅድመ ሁኔታዎች መሰረት ትክክለኛነቱ የተረጋገጠ ነው።`,
              options,
              correct_answers: isTF ? ["true"] : ["a"],
              difficulty: q % 3 === 0 ? Difficulty.HARD : Difficulty.MEDIUM,
              is_free_trial: isFree,
              is_active: true,
            },
          });
          questionCount++;
        }
      }
    }
  }
  console.log(`  ✅ ${questionCount} Questions seeded across Quiz 1, 2, 3 chapters.`);

  // ==========================================================================
  // 8. Mid, Final, and Mock Exams & COC Sets (/questions/mid, /questions/coc)
  // ==========================================================================
  console.log("\n--- 8. Seeding Mid, Final, Mock Exams & National COC Sets ---");
  for (const course of seededCourses.slice(0, 5)) {
    for (const kind of [ExamKind.MID, ExamKind.FINAL, ExamKind.MOCK]) {
      const exam = await prisma.exam.create({
        data: {
          course_id: course.id,
          university_id: aastuId,
          kind,
          title_en: `${course.title_en} ${kind} Examination`,
          title_am: `${course.title_en} የ${kind} ፈተና`,
          year: 2024,
          duration_min: kind === ExamKind.FINAL ? 60 : 35,
          passing_score: 50,
          is_free_trial: kind === ExamKind.MID,
          status: PublicationStatus.PUBLISHED,
        },
      });

      const qList = await prisma.question.findMany({ where: { course_id: course.id }, take: 4 });
      for (const [order, q] of qList.entries()) {
        await prisma.examQuestion.create({
          data: {
            exam_id: exam.id,
            question_id: q.id,
            sort_order: order + 1,
            points: 2.5,
          },
        });
      }
    }
  }

  // National Model COC Sets
  for (const setNo of [1, 2, 3]) {
    const cocSet = await prisma.cocSet.create({
      data: {
        title_en: `National Model COC Assessment - Set ${setNo}`,
        title_am: `ብሔራዊ የሞዴል COC የብቃት ማረጋገጫ - ስብስብ ${setNo}`,
        year: 2024,
        is_timed: true,
        duration_min: 60,
        sample_question_count: 5,
        status: PublicationStatus.PUBLISHED,
      },
    });

    const sampleQs = await prisma.question.findMany({
      where: { course_id: { not: null } },
      take: 5,
    });
    for (const [idx, q] of sampleQs.entries()) {
      if (!q.course_id) continue;
      const cocQ = await prisma.cocQuestion.upsert({
        where: { question_id: q.id },
        update: {},
        create: {
          question_id: q.id,
          course_id: q.course_id,
          year: 2024,
        },
      });

      await prisma.cocSetQuestion.create({
        data: {
          coc_set_id: cocSet.id,
          coc_question_id: cocQ.id,
          sort_order: idx + 1,
          is_sample: idx < 2,
        },
      });
    }
  }
  console.log(`  ✅ Mid, Final, Mock Exams and National COC Sets seeded.`);

  // ==========================================================================
  // 9. Student Exam Attempts (/dashboard analytics & student profile)
  // ==========================================================================
  console.log("\n--- 9. Seeding Student Exam Attempts & Results ---");
  const abebeStudent = studentMap.get("student@mastara.edu.et");
  const firstExam = await prisma.exam.findFirst();
  const firstCocSet = await prisma.cocSet.findFirst();

  if (abebeStudent && firstExam) {
    await prisma.attempt.create({
      data: {
        student_id: abebeStudent.id,
        exam_id: firstExam.id,
        category: AttemptCategory.EXAM,
        state: AttemptState.RESULT_AVAILABLE,
        score: 8.5,
        total_questions: 4,
        correct_count: 3,
        elapsed_ms: BigInt(1420000), // ~23 mins
        submitted_at: new Date(Date.now() - 3600000 * 24),
      },
    });
  }

  if (abebeStudent && firstCocSet) {
    await prisma.attempt.create({
      data: {
        student_id: abebeStudent.id,
        coc_set_id: firstCocSet.id,
        category: AttemptCategory.COC,
        state: AttemptState.RESULT_AVAILABLE,
        score: 9.0,
        total_questions: 5,
        correct_count: 4,
        elapsed_ms: BigInt(2100000), // ~35 mins
        submitted_at: new Date(Date.now() - 3600000 * 12),
      },
    });
  }
  console.log(`  ✅ Student assessment attempts seeded.`);

  // ==========================================================================
  // 10. Products, Pricing & Tiered Rules (/commerce/pricing)
  // ==========================================================================
  console.log("\n--- 10. Seeding Products & Commerce Packages ---");
  const products = [
    {
      type: ProductType.BUNDLE,
      stream_scope: StreamScope.ANY,
      name_en: "Semester Course Bundle",
      name_am: "የሴሚስተር ኮርስ ጥቅል",
      description_en: "Choose 7 to 10 courses with complete reading notes, formula cards, quizzes, and past exams.",
      description_am: "ለሴሚስተሩ ከ7 እስከ 10 ኮርሶችን በመምረጥ ሙሉ አገልግሎት ያግኙ።",
      price_etb: 200.0,
      duration_days: 150,
      min_courses: 7,
      max_courses: 10,
    },
    {
      type: ProductType.FULL_STREAM,
      stream_scope: StreamScope.NATURAL,
      name_en: "Full Freshman Package (Natural Science)",
      name_am: "ሙሉ የፍሬሽማን ጥቅል (የተፈጥሮ ሳይንስ)",
      description_en: "Comprehensive natural science stream package including Calculus, Physics, Chemistry, and COC.",
      description_am: "የሁለቱም ሴሚስተር የተፈጥሮ ሳይንስ ትምህርቶች ከነ COC ፈተና ጋር።",
      price_etb: 350.0,
      duration_days: 365,
    },
    {
      type: ProductType.FULL_STREAM,
      stream_scope: StreamScope.SOCIAL,
      name_en: "Full Freshman Package (Social Science)",
      name_am: "ሙሉ የፍሬሽማን ጥቅል (የማህበራዊ ሳይንስ)",
      description_en: "Comprehensive social science stream package including Economics, Geography, History, and COC.",
      description_am: "የሁለቱም ሴሚስተር የማህበራዊ ሳይንስ ትምህርቶች ከነ COC ፈተና ጋር።",
      price_etb: 350.0,
      duration_days: 365,
    },
    {
      type: ProductType.FULL_BOTH,
      stream_scope: StreamScope.BOTH,
      name_en: "All-Access Master Package (Both Streams)",
      name_am: "ሁለቱም ስትሪሞች (የተፈጥሮ እና ማህበራዊ)",
      description_en: "Full access to every university course across both streams for 1 full year.",
      description_am: "ለሁለቱም ስትሪሞች ሙሉ ዓመታዊ አገልግሎት።",
      price_etb: 700.0,
      duration_days: 365,
    },
    {
      type: ProductType.EXTRA,
      stream_scope: StreamScope.ANY,
      name_en: "Extra Course Add-on",
      name_am: "ተጨማሪ ኮርስ",
      description_en: "Single extra course add-on beyond the package limit.",
      description_am: "ከጥቅል ገደብ በላይ ተጨማሪ ኮርስ።",
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
        await prisma.priceRule.createMany({
          data: [
            { product_id: created.id, tier_no: 1, price_etb: 100.0 },
            { product_id: created.id, tier_no: 2, price_etb: 50.0 },
          ],
        });
      }
    }
  }
  console.log(`  ✅ 5 Commerce Products and Tiered Pricing Rules synchronized.`);

  // ==========================================================================
  // 11. Payments, Orders & Receipts (/commerce/payments page)
  // ==========================================================================
  console.log("\n--- 11. Seeding Payments, Orders & Verification Receipts ---");
  const bundleProduct = await prisma.product.findFirst({ where: { type: ProductType.BUNDLE } });
  const naturalProduct = await prisma.product.findFirst({ where: { type: ProductType.FULL_STREAM, stream_scope: StreamScope.NATURAL } });

  if (bundleProduct && abebeStudent) {
    // 1. Pending payment proof
    const ref1 = "FT24098ABC12345";
    const existingP1 = await prisma.paymentProof.findUnique({ where: { transaction_reference: ref1 } });
    if (!existingP1) {
      const order1 = await prisma.order.create({
        data: {
          student_id: abebeStudent.id,
          product_id: bundleProduct.id,
          stream: Stream.NATURAL,
          quoted_amount: 200.0,
          status: OrderStatus.PAYMENT_SUBMITTED,
          items: {
            create: seededCourses.slice(0, 7).map((c) => ({
              course_id: c.id,
              price_component: 28.57,
            })),
          },
        },
      });

      await prisma.paymentProof.create({
        data: {
          order_id: order1.id,
          method: PaymentMethod.CBE_MOBILE,
          transaction_reference: ref1,
          image_key: "proofs/cbe_abebe_receipt.png",
          image_size_bytes: 124500,
          image_mime: "image/png",
          status: ProofStatus.PENDING,
        },
      });
    }

    // 2. Approved payment proof with active entitlements
    const chaltu = studentMap.get("chaltu@mastara.edu.et");
    if (chaltu) {
      const ref2 = "TB2499118822";
      const existingP2 = await prisma.paymentProof.findUnique({ where: { transaction_reference: ref2 } });
      if (!existingP2) {
        const order2 = await prisma.order.create({
          data: {
            student_id: chaltu.id,
            product_id: bundleProduct.id,
            stream: Stream.NATURAL,
            quoted_amount: 200.0,
            status: OrderStatus.APPROVED,
            items: {
              create: seededCourses.slice(0, 7).map((c) => ({
                course_id: c.id,
                price_component: 28.57,
              })),
            },
          },
        });

        await prisma.paymentProof.create({
          data: {
            order_id: order2.id,
            method: PaymentMethod.TELEBIRR,
            transaction_reference: ref2,
            image_key: "proofs/telebirr_chaltu_receipt.png",
            image_size_bytes: 98400,
            image_mime: "image/png",
            status: ProofStatus.APPROVED,
            reviewed_by: adminDemo.id,
            reviewed_at: new Date(Date.now() - 3600000 * 4),
          },
        });

        // Grant entitlements
        const expiry = new Date(Date.now() + 150 * 24 * 60 * 60 * 1000);
        for (const c of seededCourses.slice(0, 7)) {
          await prisma.entitlement.create({
            data: {
              student_id: chaltu.id,
              course_id: c.id,
              order_id: order2.id,
              starts_at: new Date(),
              expires_at: expiry,
              status: EntitlementStatus.ACTIVE,
            },
          });
        }
      }
    }

    // 3. Rejected payment proof (for attention audit log testing)
    const yared = studentMap.get("yared@mastara.edu.et");
    if (yared) {
      const ref3 = "CB2488331199";
      const existingP3 = await prisma.paymentProof.findUnique({ where: { transaction_reference: ref3 } });
      if (!existingP3) {
        const order3 = await prisma.order.create({
          data: {
            student_id: yared.id,
            product_id: bundleProduct.id,
            stream: Stream.SOCIAL,
            quoted_amount: 200.0,
            status: OrderStatus.REJECTED,
            items: {
              create: seededCourses.slice(6, 13).map((c) => ({
                course_id: c.id,
                price_component: 28.57,
              })),
            },
          },
        });

        await prisma.paymentProof.create({
          data: {
            order_id: order3.id,
            method: PaymentMethod.CBE_BIRR,
            transaction_reference: ref3,
            image_key: "proofs/cbebirr_yared_receipt.png",
            image_size_bytes: 112000,
            image_mime: "image/png",
            status: ProofStatus.REJECTED,
            reviewed_by: adminDemo.id,
            reviewed_at: new Date(Date.now() - 3600000 * 2),
            reject_reason: "Illegible receipt screenshot; transaction ID truncated.",
          },
        });
      }
    }
  }
  console.log(`  ✅ Orders, Payment Proofs (Pending, Approved, Rejected) seeded.`);

  // ==========================================================================
  // 12. Support Tickets with Multi-turn Conversations (/support page)
  // ==========================================================================
  console.log("\n--- 12. Seeding Support Tickets & Conversation Threads ---");
  const ticketCount = await prisma.supportTicket.count();
  if (ticketCount === 0) {
    const studentUser = studentMap.get("student@mastara.edu.et");
    const chaltuUser = studentMap.get("chaltu@mastara.edu.et");
    const yaredUser = studentMap.get("yared@mastara.edu.et");
    const tigistUser = studentMap.get("tigist@mastara.edu.et");

    if (studentUser) {
      await prisma.supportTicket.create({
        data: {
          student_id: studentUser.id,
          subject: "CBE Mobile receipt verified but bundle still locked",
          category: "PAYMENT",
          priority: "HIGH",
          status: TicketStatus.OPEN,
          messages: {
            create: [
              {
                sender_id: studentUser.id,
                sender_role: Role.STUDENT,
                body: "I transferred 200 ETB via CBE Mobile banking with reference number FT24098ABC12345 this morning. The payment status shows Approved in CBE, but when I open Calculus I, it still prompts me to purchase and says trial expired. Please verify and unlock access.",
              },
            ],
          },
        },
      });

      await prisma.supportTicket.create({
        data: {
          student_id: studentUser.id,
          subject: "Phone replaced – need device released",
          category: "DEVICE",
          priority: "HIGH",
          status: TicketStatus.OPEN,
          messages: {
            create: [
              {
                sender_id: studentUser.id,
                sender_role: Role.STUDENT,
                body: "Hello Admin, I lost my Android phone yesterday on campus. I bought a new Samsung device today, but when I try to log in, the app shows 'Device limit reached: Account already bound to another phone'. Could you please release my old phone binding so I can continue studying for my midterms?",
              },
            ],
          },
        },
      });
    }

    if (chaltuUser) {
      await prisma.supportTicket.create({
        data: {
          student_id: chaltuUser.id,
          subject: "COC exit exam mock questions review",
          category: "EXAMS",
          priority: "NORMAL",
          status: TicketStatus.ANSWERED,
          messages: {
            create: [
              {
                sender_id: chaltuUser.id,
                sender_role: Role.STUDENT,
                body: "I noticed question 14 on the Exit Exam Mock for Nursing had two conflicting options. Could the content team check the explanation provided?",
              },
              {
                sender_id: adminDemo.id,
                sender_role: Role.ADMIN,
                body: "Thank you for bringing this to our attention Chaltu! Our medical review panel reviewed question 14 and updated the explanation and answer key in today's content release.",
              },
            ],
          },
        },
      });
    }

    if (yaredUser) {
      await prisma.supportTicket.create({
        data: {
          student_id: yaredUser.id,
          subject: "Offline downloads resume support",
          category: "GENERAL",
          priority: "LOW",
          status: TicketStatus.RESOLVED,
          messages: {
            create: [
              {
                sender_id: yaredUser.id,
                sender_role: Role.STUDENT,
                body: "When downloading videos on Ethio Telecom 3G, the download pauses and restarts from zero. Is there resume support?",
              },
              {
                sender_id: adminDemo.id,
                sender_role: Role.ADMIN,
                body: "Hello! We have rolled out an update that enables chunked byte-range resume for offline downloads. Please ensure your Mastara mobile app is updated to the latest version.",
              },
            ],
          },
        },
      });
    }

    if (tigistUser) {
      await prisma.supportTicket.create({
        data: {
          student_id: tigistUser.id,
          subject: "Requesting Amharic audio explanation for Logic Chapter 2",
          category: "CONTENT",
          priority: "NORMAL",
          status: TicketStatus.OPEN,
          messages: {
            create: [
              {
                sender_id: tigistUser.id,
                sender_role: Role.STUDENT,
                body: "The written Amharic notes for Fallacies of Ambiguity are very helpful. Could you also add voice audio walkthroughs for syllogisms?",
              },
            ],
          },
        },
      });
    }
    console.log("  ✅ Support tickets with 2-way conversation threads seeded.");
  }

  // ==========================================================================
  // 13. Broadcasts & In-App Notifications (/notifications page)
  // ==========================================================================
  console.log("\n--- 13. Seeding Broadcast Announcements & Push Notifications ---");
  const broadcastCount = await prisma.broadcast.count();
  if (broadcastCount === 0) {
    await prisma.broadcast.createMany({
      data: [
        {
          title: "2026 Model COC Exam Sets Released",
          body: "Comprehensive Model COC exams for Natural and Social sciences are now unlocked in the Exams section.",
          audience: "ALL",
          priority: "EXAM",
          action_url: "/exam/coc",
          sent_by: "Admin (System)",
          recipient_count: 148,
          created_at: new Date(Date.now() - 3600000 * 5),
        },
        {
          title: "General Physics Formula Notes Updated",
          body: "Formulas and offline KaTeX equation cards updated for Chapter 3 with Ethiopic translations.",
          audience: "NATURAL_SCIENCE",
          priority: "INFO",
          action_url: "/course/physics",
          sent_by: "Admin (System)",
          recipient_count: 92,
          created_at: new Date(Date.now() - 3600000 * 28),
        },
        {
          title: "Telebirr Payment Gateway Maintenance",
          body: "Scheduled payment verification maintenance completed. Instant bundle activations are back online.",
          audience: "ALL",
          priority: "MAINTENANCE",
          sent_by: "Admin (System)",
          recipient_count: 148,
          created_at: new Date(Date.now() - 3600000 * 72),
        },
      ],
    });
  }

  // Student in-app notifications
  if (abebeStudent) {
    const notifCount = await prisma.notification.count({ where: { student_id: abebeStudent.id } });
    if (notifCount === 0) {
      await prisma.notification.createMany({
        data: [
          {
            student_id: abebeStudent.id,
            type: NotificationType.WELCOME,
            title_en: "Welcome to Mastara!",
            title_am: "ወደ ማስጣራ እንኳን ደህና መጡ!",
            message_en: "Your university freshman study portal is ready. Access course notes, practice tests, and COC prep.",
            message_am: "የዩኒቨርሲቲ የፍሬሽማን የትምህርት መድረክዎ ዝግጁ ነው። ማስታወሻዎችንና የፈተና ዝግጅቶችን ያግኙ።",
            is_read: true,
            created_at: new Date(Date.now() - 3600000 * 48),
          },
          {
            student_id: abebeStudent.id,
            type: NotificationType.PAYMENT_APPROVED,
            title_en: "Payment Proof Verified",
            title_am: "ክፍያዎ ተረጋግጧል",
            message_en: "Your transfer of 200 ETB has been confirmed. Full access unlocked for Semester 1 courses.",
            message_am: "የ 200 ብር ክፍያዎ ተረጋግጧል። የሴሚስተር 1 ትምህርቶች ሙሉ በሙሉ ተከፍተዋል።",
            is_read: false,
            created_at: new Date(Date.now() - 3600000 * 2),
          },
          {
            student_id: abebeStudent.id,
            type: NotificationType.EXAM_RESULT,
            title_en: "Calculus I Midterm Scored",
            title_am: "የካልኩለስ 1 የፈተና ውጤት",
            message_en: "You scored 85% on Calculus I Mid Exam. Great job! Check question explanations for review.",
            message_am: "በካልኩለስ 1 ፈተና 85% አግኝተዋል። ማብራሪያዎችን በመመልከት ይከልሱ።",
            is_read: false,
            created_at: new Date(Date.now() - 3600000 * 1),
          },
        ],
      });
    }
  }
  console.log(`  ✅ Broadcast announcements & In-app notifications seeded.`);

  // ==========================================================================
  // 14. Scan-to-PDF Studio Jobs (/scan-to-pdf page)
  // ==========================================================================
  console.log("\n--- 14. Seeding Scan-to-PDF Jobs & Pages ---");
  const scanCount = await prisma.scanJob.count();
  if (scanCount === 0) {
    const calculusCourse = seededCourses.find((c) => c.code === "MAT101") || seededCourses[0];
    const physicsCourse = seededCourses.find((c) => c.code === "PHY101") || seededCourses[1];

    // Job 1: Completed scan job
    const job1 = await prisma.scanJob.create({
      data: {
        title: "Calculus I - 2024 Midterm Exam Handwritten Solutions",
        course_id: calculusCourse?.id,
        status: ScanJobStatus.SUCCEEDED,
        created_by: adminDemo.id,
        metadata: { source: "Scanner AASTU Library", totalPages: 4, resolutionDpi: 300 },
      },
    });

    for (let p = 1; p <= 4; p++) {
      await prisma.scanPage.create({
        data: {
          job_id: job1.id,
          page_no: p,
          image_key: `scans/calc_mid_p${p}.png`,
          rotation_deg: 0,
        },
      });
    }

    // Job 2: Completed physics lab guide
    const job2 = await prisma.scanJob.create({
      data: {
        title: "General Physics Lab Manual & Error Analysis Tables",
        course_id: physicsCourse?.id,
        status: ScanJobStatus.SUCCEEDED,
        created_by: adminDemo.id,
        metadata: { source: "Physics Dept AAU", totalPages: 3 },
      },
    });

    for (let p = 1; p <= 3; p++) {
      await prisma.scanPage.create({
        data: {
          job_id: job2.id,
          page_no: p,
          image_key: `scans/phy_lab_p${p}.png`,
          rotation_deg: 0,
        },
      });
    }

    // Job 3: Processing draft job
    const job3 = await prisma.scanJob.create({
      data: {
        title: "Introduction to Logic - Symbolic Derivation Notes Draft",
        status: ScanJobStatus.PROCESSING,
        created_by: adminDemo.id,
        metadata: { source: "Mobile Document Scan", totalPages: 2 },
      },
    });

    for (let p = 1; p <= 2; p++) {
      await prisma.scanPage.create({
        data: {
          job_id: job3.id,
          page_no: p,
          image_key: `scans/logic_notes_p${p}.png`,
          rotation_deg: 0,
        },
      });
    }
    console.log(`  ✅ 3 Scan-to-PDF jobs with pages seeded.`);
  }

  // ==========================================================================
  // 15. Attention-Only Audit Logs (/audit page)
  // ==========================================================================
  console.log("\n--- 15. Seeding Critical Attention Audit Entries ---");
  const auditCount = await prisma.auditLog.count();
  if (auditCount === 0) {
    await prisma.auditLog.createMany({
      data: [
        {
          actor_id: adminDemo.id,
          actor_role: Role.ADMIN,
          action: "PAYMENT_REJECTED",
          target_type: "PaymentProof",
          target_id: "proof_cb2488331199",
          metadata: {
            reason: "Illegible receipt screenshot; transaction ID truncated.",
            studentEmail: "yared@mastara.edu.et",
            amount: 200,
          },
          created_at: new Date(Date.now() - 3600000 * 2),
        },
        {
          actor_id: adminDemo.id,
          actor_role: Role.ADMIN,
          action: "DEVICE_REVOKED",
          target_type: "DeviceBinding",
          target_id: "hw_fp_infinix_hot30_05",
          metadata: {
            deviceModel: "Infinix Hot 30",
            studentEmail: "dawit@mastara.edu.et",
            reason: "Suspicious concurrent login detected from separate IP blocks.",
          },
          created_at: new Date(Date.now() - 3600000 * 8),
        },
        {
          actor_id: adminDemo.id,
          actor_role: Role.ADMIN,
          action: "ACCESS_EXTENDED",
          target_type: "Entitlement",
          target_id: "ent_mat101_abebe",
          metadata: {
            studentEmail: "student@mastara.edu.et",
            courseCode: "MAT101",
            additionalDays: 30,
            reason: "University final exam date postponed by academic commission.",
          },
          created_at: new Date(Date.now() - 3600000 * 24),
        },
        {
          actor_id: adminDemo.id,
          actor_role: Role.ADMIN,
          action: "PRICE_CHANGED",
          target_type: "Product",
          target_id: "prod_bundle_semester",
          metadata: {
            productName: "Semester Course Bundle",
            previousPrice: 250,
            newPrice: 200,
            reason: "National university remedial discount promotion.",
          },
          created_at: new Date(Date.now() - 3600000 * 48),
        },
        {
          actor_id: adminDemo.id,
          actor_role: Role.ADMIN,
          action: "STUDENT_SUSPENDED",
          target_type: "Student",
          target_id: "student_susp_test_99",
          metadata: {
            studentEmail: "suspended.student@mastara.edu.et",
            reason: "Multiple failed verification attempts on fraudulent CBE transaction slips.",
          },
          created_at: new Date(Date.now() - 3600000 * 72),
        },
      ],
    });
    console.log("  ✅ Critical attention audit entries seeded.");
  }

  console.log("\n========================================================");
  console.log("✨ Mastara Complete Multi-Page Seed Finished Successfully!");
  console.log("========================================================\n");


}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
