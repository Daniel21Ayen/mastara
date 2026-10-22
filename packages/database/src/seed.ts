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
} from "@prisma/client";
import { prisma } from "./client";

async function main() {
  console.log("🌱 Starting Mastara Production Seed Enrichment (Phase 2)...");

  // --------------------------------------------------------------------------
  // 1. System Users (Admin & Demo Student)
  // --------------------------------------------------------------------------
  const adminEmail = "admin@mastara.edu.et";
  const admin = await prisma.student.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      phone: "+251911000000",
      password_hash: "$2a$10$qeC6ZERtYEg1QXVNhUKxNu9OAlnhsv6MduYJ8z5ngJIiQC3OEOnmq", // password123
      role: Role.ADMIN,
      first_name: "Mastara",
      last_name: "Admin",
    },
  });
  console.log("  ✅ Admin user verified:", admin.email);

  const studentEmail = "student@mastara.edu.et";
  const student = await prisma.student.upsert({
    where: { email: studentEmail },
    update: {},
    create: {
      email: studentEmail,
      phone: "+251911223344",
      password_hash: "$2a$10$qeC6ZERtYEg1QXVNhUKxNu9OAlnhsv6MduYJ8z5ngJIiQC3OEOnmq", // password123
      role: Role.STUDENT,
      first_name: "Abebe",
      last_name: "Kebede",
      stream_pref: Stream.NATURAL,
    },
  });
  console.log("  ✅ Demo student verified:", student.email);

  // --------------------------------------------------------------------------
  // 2. Universities (Reference Universities from mock data & SRS)
  // --------------------------------------------------------------------------
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
      update: { name_en: u.name_en, name_am: u.name_am },
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

  // --------------------------------------------------------------------------
  // 3. Academic Programs & Semesters (From mobile mock data)
  // --------------------------------------------------------------------------
  const programsData = [
    { univCode: "AASTU", code: "SE", name_en: "Software Engineering", name_am: "ሶፍትዌር ኢንጂነሪንግ" },
    { univCode: "AASTU", code: "CE", name_en: "Civil Engineering", name_am: "ሲቪል ኢንጂነሪንግ" },
    { univCode: "BDU", code: "CS", name_en: "Computer Science", name_am: "ኮምፒውተር ሳይንስ" },
    { univCode: "BDU", code: "ACC", name_en: "Accounting", name_am: "አካውንቲንግ" },
    { univCode: "JU", code: "MED", name_en: "Medicine", name_am: "ህክምና" },
    { univCode: "JU", code: "ECO", name_en: "Economics", name_am: "ኢኮኖሚክስ" },
    { univCode: "MU", code: "LAW", name_en: "Law", name_am: "ህግ" },
    { univCode: "MU", code: "BIO", name_en: "Biology", name_am: "ባዮሎጂ" },
  ];

  const semesterMap = new Map<string, string>(); // "programId_S1" -> semesterId
  let defaultSemesterId = "";

  for (const p of programsData) {
    const universityId = univMap.get(p.univCode);
    if (!universityId) continue;

    const prog = await prisma.program.upsert({
      where: { university_id_code: { university_id: universityId, code: p.code } },
      update: { name_en: p.name_en, name_am: p.name_am },
      create: {
        university_id: universityId,
        code: p.code,
        name_en: p.name_en,
        name_am: p.name_am,
        status: PublicationStatus.PUBLISHED,
      },
    });

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
  console.log(`  ✅ Academic Programs and Semesters synchronized.`);

  // Update demo student's academic profile
  const aastuId = univMap.get("AASTU");
  if (aastuId) {
    const aastuSe = await prisma.program.findFirst({ where: { university_id: aastuId, code: "SE" } });
    if (aastuSe) {
      const s1 = semesterMap.get(`${aastuSe.id}_S1`);
      await prisma.student.update({
        where: { id: student.id },
        data: {
          university_id: aastuId,
          program_id: aastuSe.id,
          semester_id: s1,
          profile_completed_at: new Date(),
        },
      });
    }
  }

  // --------------------------------------------------------------------------
  // 4. Courses (From apps/mobile/src/core/mock/data/courses.ts)
  // --------------------------------------------------------------------------
  const coursesTemplates = [
    // Semester 1
    { semNum: 1, code: "ENG101", title_en: "Communicative English", title_am: "ኮሚዩኒኬቲቭ እንግሊዝኛ", stream: Stream.COMMON },
    { semNum: 1, code: "LOG101", title_en: "Logic and Critical Thinking", title_am: "ሎጂክ እና ሂሳዊ አስተሳሰብ", stream: Stream.COMMON },
    { semNum: 1, code: "CIV101", title_en: "Civics and Ethical Education", title_am: "ሲቪክስ እና ስነምግባር", stream: Stream.COMMON },
    { semNum: 1, code: "MAT101", title_en: "Calculus I", title_am: "ካልኩለስ 1", stream: Stream.NATURAL },
    { semNum: 1, code: "PHY101", title_en: "General Physics", title_am: "አጠቃላይ ፊዚክስ", stream: Stream.NATURAL },
    { semNum: 1, code: "CHE101", title_en: "General Chemistry", title_am: "አጠቃላይ ኬሚስትሪ", stream: Stream.NATURAL },
    { semNum: 1, code: "GEO101", title_en: "Geography of Ethiopia and the Horn", title_am: "የኢትዮጵያና የቀንድ አፍሪካ ጂኦግራፊ", stream: Stream.SOCIAL },
    { semNum: 1, code: "HIS101", title_en: "History of Ethiopia and the Horn", title_am: "የኢትዮጵያና የቀንድ አፍሪካ ታሪክ", stream: Stream.SOCIAL },
    { semNum: 1, code: "ECO101", title_en: "Introduction to Economics", title_am: "የኢኮኖሚክስ መግቢያ", stream: Stream.SOCIAL },
    // Semester 2
    { semNum: 2, code: "ENG102", title_en: "Basic Writing Skills", title_am: "መሰረታዊ የፅሁፍ ክህሎት", stream: Stream.COMMON },
    { semNum: 2, code: "ANT102", title_en: "Social Anthropology", title_am: "ማህበራዊ አንትሮፖሎጂ", stream: Stream.COMMON },
    { semNum: 2, code: "FIT102", title_en: "Physical Fitness", title_am: "አካላዊ ብቃት", stream: Stream.COMMON },
    { semNum: 2, code: "MAT102", title_en: "Calculus II", title_am: "ካልኩለስ 2", stream: Stream.NATURAL },
    { semNum: 2, code: "BIO102", title_en: "General Biology", title_am: "አጠቃላይ ባዮሎጂ", stream: Stream.NATURAL },
    { semNum: 2, code: "PHY102", title_en: "Mechanics and Heat", title_am: "ሜካኒክስ እና ሙቀት", stream: Stream.NATURAL },
    { semNum: 2, code: "MAT112", title_en: "Mathematics for Social Sciences", title_am: "ሂሳብ ለማህበራዊ ሳይንስ", stream: Stream.SOCIAL },
    { semNum: 2, code: "PSY102", title_en: "Introduction to Psychology", title_am: "የስነ-ልቦና መግቢያ", stream: Stream.SOCIAL },
    { semNum: 2, code: "GEO102", title_en: "Introduction to Human Geography", title_am: "የሰው ልጅ ጂኦግራፊ መግቢያ", stream: Stream.SOCIAL },
  ];

  const seededCourses: { id: string; code: string; title_en: string; stream: Stream }[] = [];

  for (const c of coursesTemplates) {
    const targetSemesterId = defaultSemesterId;
    if (!targetSemesterId) continue;

    const courseRecord = await prisma.course.upsert({
      where: { semester_id_code: { semester_id: targetSemesterId, code: c.code } },
      update: {
        title_en: c.title_en,
        title_am: c.title_am,
        stream: c.stream,
        status: PublicationStatus.PUBLISHED,
      },
      create: {
        semester_id: targetSemesterId,
        code: c.code,
        title_en: c.title_en,
        title_am: c.title_am,
        stream: c.stream,
        status: PublicationStatus.PUBLISHED,
        is_promotional: c.code === "ENG101" || c.code === "LOG101",
      },
    });

    seededCourses.push({
      id: courseRecord.id,
      code: courseRecord.code,
      title_en: courseRecord.title_en,
      stream: courseRecord.stream,
    });
  }
  console.log(`  ✅ ${seededCourses.length} Courses synchronized.`);

  // --------------------------------------------------------------------------
  // 5. Course Modules, Topics & Bilingual Reading Content
  // --------------------------------------------------------------------------
  for (const course of seededCourses.slice(0, 5)) {
    // Seed Module 1
    const module1 = await prisma.module.upsert({
      where: { course_id_code: { course_id: course.id, code: "MOD-1" } },
      update: {},
      create: {
        course_id: course.id,
        code: "MOD-1",
        title_en: `${course.title_en} - Fundamentals`,
        title_am: `${course.title_en} - መሰረታዊ ፅንሰ ሃሳቦች`,
        is_free_trial: true,
        status: PublicationStatus.PUBLISHED,
        sort_order: 1,
      },
    });

    // Seed 3 Topics per module
    for (let chapterNum = 1; chapterNum <= 3; chapterNum++) {
      const isFree = chapterNum === 1;
      const topic = await prisma.topic.upsert({
        where: { module_id_chapter_number: { module_id: module1.id, chapter_number: chapterNum } },
        update: {},
        create: {
          module_id: module1.id,
          chapter_number: chapterNum,
          title_en: `Chapter ${chapterNum}: Introduction to ${course.title_en}`,
          title_am: `ምዕራፍ ${chapterNum}: የ${course.title_en} መግቢያ`,
          is_free_trial: isFree,
          sort_order: chapterNum,
        },
      });

      // Seed Content with Bilingual Text and LaTeX math
      await prisma.content.upsert({
        where: { topic_id_version: { topic_id: topic.id, version: 1 } },
        update: {},
        create: {
          topic_id: topic.id,
          version: 1,
          status: PublicationStatus.PUBLISHED,
          title_en: `Overview of Chapter ${chapterNum}`,
          title_am: `የምዕራፍ ${chapterNum} አጠቃላይ እይታ`,
          body_en: `Welcome to chapter ${chapterNum} of ${course.title_en}. Here we examine fundamental definitions, core properties, and formulas such as $f(x) = \\int_0^x t^2 dt$ and $E = mc^2$.\n\n$$\\lim_{x \\to 0} \\frac{\\sin x}{x} = 1$$`,
          body_am: `ወደ ${course.title_en} ምዕራፍ ${chapterNum} እንኳን ደህና መጡ። በዚህ ምዕራፍ መሰረታዊ ፅንሰ ሀሳቦችን እና ስሌቶችን እንደ $f(x) = \\int_0^x t^2 dt$ እንመለከታለን።`,
          is_free_trial: isFree,
          published_at: new Date(),
        },
      });
    }
  }
  console.log(`  ✅ Modules, Topics, and Bilingual Reading Content seeded.`);

  // --------------------------------------------------------------------------
  // 6. Quizzes, Chapters & Questions (Matching apps/mobile/src/core/mock/data/quizzes.ts)
  // --------------------------------------------------------------------------
  let totalQuestionsCount = 0;
  for (const course of seededCourses.slice(0, 5)) {
    for (const quizNo of [1, 2, 3]) {
      for (let chIdx = 1; chIdx <= 3; chIdx++) {
        const chapterNumber = (quizNo - 1) * 3 + chIdx;
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

        // Seed 5 sample questions per chapter
        for (let qIdx = 1; qIdx <= 5; qIdx++) {
          const qType = qIdx % 2 === 0 ? QuestionType.SINGLE_CHOICE : QuestionType.TRUE_FALSE;
          const options =
            qType === QuestionType.TRUE_FALSE
              ? [
                  { id: "true", label: { en: "True", am: "እውነት" } },
                  { id: "false", label: { en: "False", am: "ሐሰት" } },
                ]
              : [
                  { id: "opt_a", label: { en: `Primary concept option A for Q${qIdx}`, am: `ዋና ምርጫ ሀ ለጥያቄ ${qIdx}` } },
                  { id: "opt_b", label: { en: `Secondary concept option B for Q${qIdx}`, am: `ሁለተኛ ምርጫ ለ ለጥያቄ ${qIdx}` } },
                  { id: "opt_c", label: { en: `Alternative option C for Q${qIdx}`, am: `ተለዋጭ ምርጫ ሐ ለጥያቄ ${qIdx}` } },
                  { id: "opt_d", label: { en: `None of the above`, am: `ከላይ የተጠቀሱት አይደሉም` } },
                ];
          const correctAnswers = qType === QuestionType.TRUE_FALSE ? ["true"] : ["opt_a"];

          await prisma.question.create({
            data: {
              course_id: course.id,
              type: qType,
              prompt_en: `What is the significance of property #${qIdx} in ${course.title_en} (Chapter ${chapterNumber})?`,
              prompt_am: `በ${course.title_en} ውስጥ የባህሪ #${qIdx} ፋይዳ ምንድን ነው (ምዕራፍ ${chapterNumber})?`,
              explanation_en: `Detailed academic rationale explaining why the answer satisfies the core property.`,
              explanation_am: `መልሱ ለምን ትክክል እንደሆነ የሚያብራራ ዝርዝር ትምህርታዊ ማብራሪያ።`,
              options,
              correct_answers: correctAnswers,
              difficulty: Difficulty.MEDIUM,
              is_free_trial: isFree,
              is_active: true,
            },
          });
          totalQuestionsCount++;
        }
      }
    }
  }
  console.log(`  ✅ Quizzes, Chapters, and ${totalQuestionsCount} Assessment Questions seeded.`);

  // --------------------------------------------------------------------------
  // 7. Exams & COC Sets (From apps/mobile/src/core/mock/data/exams.ts)
  // --------------------------------------------------------------------------
  const aastUID = univMap.get("AASTU");
  for (const course of seededCourses.slice(0, 3)) {
    for (const kind of [ExamKind.MID, ExamKind.FINAL, ExamKind.MOCK]) {
      const exam = await prisma.exam.create({
        data: {
          course_id: course.id,
          university_id: aastUID,
          kind,
          title_en: `${course.title_en} ${kind} Exam`,
          title_am: `${course.title_en} የ${kind} ፈተና`,
          year: 2024,
          duration_min: kind === ExamKind.FINAL ? 60 : 30,
          passing_score: 50,
          is_free_trial: kind === ExamKind.MID,
          status: PublicationStatus.PUBLISHED,
        },
      });

      // Link first 5 course questions to this exam
      const courseQuestions = await prisma.question.findMany({
        where: { course_id: course.id },
        take: 5,
      });

      for (const [order, q] of courseQuestions.entries()) {
        await prisma.examQuestion.create({
          data: {
            exam_id: exam.id,
            question_id: q.id,
            sort_order: order + 1,
            points: 2.0,
          },
        });
      }
    }
  }
  console.log(`  ✅ Mid, Final, and Mock Exams seeded.`);

  // Seed COC Sets
  for (const setNo of [1, 2, 3]) {
    const cocSet = await prisma.cocSet.create({
      data: {
        title_en: `Freshman Comprehensive COC - Set ${setNo}`,
        title_am: `የፍሬሽማን አጠቃላይ የብቃት ማረጋገጫ (COC) - ስብስብ ${setNo}`,
        year: 2024,
        is_timed: true,
        duration_min: 45,
        sample_question_count: 5,
        status: PublicationStatus.PUBLISHED,
      },
    });

    // Attach sample questions from courses
    const sampleQuestions = await prisma.question.findMany({ take: 5 });
    for (const [idx, q] of sampleQuestions.entries()) {
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
  console.log(`  ✅ 3 Standard COC Sets and sample questions seeded.`);

  // --------------------------------------------------------------------------
  // 8. Products, Pricing & Price Rules (SRS Section 3.2 & commerce.ts)
  // --------------------------------------------------------------------------
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
        await prisma.priceRule.createMany({
          data: [
            { product_id: created.id, tier_no: 1, price_etb: 100.0 },
            { product_id: created.id, tier_no: 2, price_etb: 50.0 },
          ],
        });
      }
    }
  }
  console.log(`  ✅ Products, Pricing, and Tiered Rules synchronized.`);

  // --------------------------------------------------------------------------
  // 9. Demo Enrollments & Active Entitlements for Student
  // --------------------------------------------------------------------------
  for (const course of seededCourses.slice(0, 6)) {
    await prisma.studentCourse.upsert({
      where: { student_id_course_id: { student_id: student.id, course_id: course.id } },
      update: {},
      create: {
        student_id: student.id,
        course_id: course.id,
        is_active: true,
      },
    });
  }

  // Grant active entitlement for the first 3 courses (valid for 120 days)
  const now = new Date();
  const futureExpiry = new Date(now.getTime() + 120 * 24 * 60 * 60 * 1000);
  for (const course of seededCourses.slice(0, 3)) {
    const existingEnt = await prisma.entitlement.findFirst({
      where: { student_id: student.id, course_id: course.id },
    });
    if (!existingEnt) {
      await prisma.entitlement.create({
        data: {
          student_id: student.id,
          course_id: course.id,
          starts_at: now,
          expires_at: futureExpiry,
          status: EntitlementStatus.ACTIVE,
        },
      });
    }
  }
  console.log(`  ✅ Demo student courses and active entitlements configured.`);

  // --------------------------------------------------------------------------
  // 10. Additional Demo Students, Orders & Payment Proofs for Live Testing
  // --------------------------------------------------------------------------
  if (univMap.get("AASTU")) {
    await prisma.student.update({
      where: { id: student.id },
      data: { university_id: univMap.get("AASTU") },
    });
  }

  const chaltu = await prisma.student.upsert({
    where: { email: "chaltu@mastara.edu.et" },
    update: { university_id: univMap.get("AAU") },
    create: {
      email: "chaltu@mastara.edu.et",
      phone: "+251922334455",
      password_hash: "$2a$10$qeC6ZERtYEg1QXVNhUKxNu9OAlnhsv6MduYJ8z5ngJIiQC3OEOnmq",
      role: Role.STUDENT,
      first_name: "Chaltu",
      last_name: "Desta",
      stream_pref: Stream.NATURAL,
      university_id: univMap.get("AAU"),
    },
  });

  const yared = await prisma.student.upsert({
    where: { email: "yared@mastara.edu.et" },
    update: { university_id: univMap.get("BDU") },
    create: {
      email: "yared@mastara.edu.et",
      phone: "+251933445566",
      password_hash: "$2a$10$qeC6ZERtYEg1QXVNhUKxNu9OAlnhsv6MduYJ8z5ngJIiQC3OEOnmq",
      role: Role.STUDENT,
      first_name: "Yared",
      last_name: "Tadesse",
      stream_pref: Stream.SOCIAL,
      university_id: univMap.get("BDU"),
    },
  });

  const bundleProduct = await prisma.product.findFirst({
    where: { type: ProductType.BUNDLE },
  });

  if (bundleProduct) {
    const existingProof1 = await prisma.paymentProof.findUnique({
      where: { transaction_reference: "FT24098ABC12345" },
    });
    if (!existingProof1) {
      const order1 = await prisma.order.create({
        data: {
          student_id: student.id,
          product_id: bundleProduct.id,
          stream: Stream.NATURAL,
          quoted_amount: 200.0,
          status: OrderStatus.PAYMENT_SUBMITTED,
          items: {
            create: seededCourses.slice(0, 6).map((c) => ({
              course_id: c.id,
              price_component: 33.33,
            })),
          },
        },
      });

      await prisma.paymentProof.create({
        data: {
          order_id: order1.id,
          method: PaymentMethod.CBE_MOBILE,
          transaction_reference: "FT24098ABC12345",
          image_key: "proofs/cbe_abebe_receipt.png",
          image_size_bytes: 124500,
          image_mime: "image/png",
          status: ProofStatus.PENDING,
        },
      });
    }

    const existingProof2 = await prisma.paymentProof.findUnique({
      where: { transaction_reference: "TB2499118822" },
    });
    if (!existingProof2) {
      const order2 = await prisma.order.create({
        data: {
          student_id: chaltu.id,
          product_id: bundleProduct.id,
          stream: Stream.NATURAL,
          quoted_amount: 200.0,
          status: OrderStatus.APPROVED,
          items: {
            create: seededCourses.slice(0, 6).map((c) => ({
              course_id: c.id,
              price_component: 33.33,
            })),
          },
        },
      });

      await prisma.paymentProof.create({
        data: {
          order_id: order2.id,
          method: PaymentMethod.TELEBIRR,
          transaction_reference: "TB2499118822",
          image_key: "proofs/telebirr_chaltu_receipt.png",
          image_size_bytes: 98400,
          image_mime: "image/png",
          status: ProofStatus.APPROVED,
          reviewed_by: admin.id,
          reviewed_at: new Date(),
        },
      });
    }

    const existingProof3 = await prisma.paymentProof.findUnique({
      where: { transaction_reference: "CB2488331122" },
    });
    if (!existingProof3) {
      const order3 = await prisma.order.create({
        data: {
          student_id: yared.id,
          product_id: bundleProduct.id,
          stream: Stream.SOCIAL,
          quoted_amount: 200.0,
          status: OrderStatus.PAYMENT_SUBMITTED,
          items: {
            create: seededCourses.slice(6, 12).map((c) => ({
              course_id: c.id,
              price_component: 33.33,
            })),
          },
        },
      });

      await prisma.paymentProof.create({
        data: {
          order_id: order3.id,
          method: PaymentMethod.CBE_BIRR,
          transaction_reference: "CB2488331122",
          image_key: "proofs/cbebirr_yared_receipt.png",
          image_size_bytes: 112000,
          image_mime: "image/png",
          status: ProofStatus.PENDING,
        },
      });
    }
  }
  console.log(`  ✅ Demo students, orders and payment proofs configured.`);

  // --------------------------------------------------------------------------
  // Support Tickets
  // --------------------------------------------------------------------------
  const ticketCount = await prisma.supportTicket.count();
  if (ticketCount === 0) {
    const studentUser = await prisma.student.findUnique({ where: { email: studentEmail } });
    const chaltuUser = await prisma.student.findUnique({ where: { email: "chaltu@mastara.edu.et" } });
    const yaredUser = await prisma.student.findUnique({ where: { email: "yared@mastara.edu.et" } });

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
                body: "I transferred 200 ETB via CBE Mobile banking with reference number FT2409187312 this morning. The payment status shows Approved in CBE, but when I open Calculus I, it still prompts me to purchase and says trial expired. Please verify and unlock access.",
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
                sender_id: admin.id,
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
                sender_id: admin.id,
                sender_role: Role.ADMIN,
                body: "Hello! We have rolled out an update that enables chunked byte-range resume for offline downloads. Please ensure your Mastara mobile app is updated to the latest version.",
              },
            ],
          },
        },
      });
    }
    console.log("  ✅ Support tickets seeded.");
  }

  // --------------------------------------------------------------------------
  // Broadcasts
  // --------------------------------------------------------------------------
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
    console.log("  ✅ Student broadcasts seeded.");
  }

  console.log("✨ Mastara Phase 2 Seed Enrichment completed successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
