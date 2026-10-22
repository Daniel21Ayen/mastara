// apps/api/test/content-integration.spec.ts
import "dotenv/config";
import { topicSchema } from "@mastara/contracts";
import { PrismaService } from "../src/infrastructure/database/prisma.service";

async function runContentIntegrationSpec() {
  console.log("=== End-to-End Content Delivery & Material Studio Live Integration ===\n");

  const API_URL = "http://localhost:3000/api/v1";
  const prisma = new PrismaService();

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

  try {
    // ----------------------------------------------------
    // 1. Authenticate Admin and Student
    // ----------------------------------------------------
    console.log("--- 1. Authenticate Admin & Student ---");
    const adminLoginRes = await fetch(`${API_URL}/auth/admin/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        identifier: "admin@mastara.edu.et",
        password: "password123",
      }),
    });
    const adminAuth = (await adminLoginRes.json()) as any;
    assert(adminLoginRes.status === 200 && !!adminAuth.token, "Admin logged in successfully with JWT");
    const adminToken = adminAuth.token;

    const studentLoginRes = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        identifier: "student@mastara.edu.et",
        password: "password123",
      }),
    });
    const studentAuth = (await studentLoginRes.json()) as any;
    assert(studentLoginRes.status === 200 && !!studentAuth.token, "Student logged in successfully with JWT");
    const studentToken = studentAuth.token;

    // Snapshot count of attention audit logs in DB before content operations
    const initialAuditCount = await prisma.auditLog.count();

    // ----------------------------------------------------
    // 2. Admin Content APIs (Material Management & Studio)
    // ----------------------------------------------------
    console.log("\n--- 2. Admin Content APIs ---");
    const coursesRes = await fetch(`${API_URL}/content/admin/courses`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const courses = (await coursesRes.json()) as any[];
    assert(coursesRes.status === 200 && Array.isArray(courses) && courses.length > 0, "Admin lists courses");
    const testCourse = courses[0];
    assert(!!testCourse.id && !!testCourse.code, `Found target course: ${testCourse.code} (${testCourse.title})`);

    const summaryRes = await fetch(`${API_URL}/content/admin/courses/${testCourse.id}/summary`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const summary = (await summaryRes.json()) as any;
    assert(summaryRes.status === 200, "Admin gets course content summary");
    assert(typeof summary.moduleCount === "number", "Summary includes moduleCount");
    assert(typeof summary.quizCount === "number", "Summary includes quizCount");

    const modulesRes = await fetch(`${API_URL}/content/admin/courses/${testCourse.id}/modules`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const modules = (await modulesRes.json()) as any[];
    assert(modulesRes.status === 200 && Array.isArray(modules), "Admin lists course modules");

    const notesRes = await fetch(`${API_URL}/content/admin/courses/${testCourse.id}/notes`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const notes = (await notesRes.json()) as any[];
    assert(notesRes.status === 200 && Array.isArray(notes), "Admin lists course notes");

    // Admin creates a new module
    const createModRes = await fetch(`${API_URL}/content/admin/modules`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        courseId: testCourse.id,
        title: {
          en: `Integration Module ${Date.now()}`,
          am: `የውህደት ሞጁል ${Date.now()}`,
        },
        status: "PUBLISHED",
      }),
    });
    const createdMod = (await createModRes.json()) as any;
    assert(createModRes.status === 201 && !!createdMod.id, "Admin creates new published module");

    // Admin adds a topic to the module
    const createTopicRes = await fetch(`${API_URL}/content/admin/topics`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        moduleId: createdMod.id,
        title: {
          en: "Integral Calculus & Vector Space",
          am: "ኢንቴግራል ካልኩለስ እና ቬክተር ስፔስ",
        },
      }),
    });
    const createdTopic = (await createTopicRes.json()) as any;
    assert(createTopicRes.status === 201 && !!createdTopic.id, "Admin adds topic to module");

    // Admin creates bilingual published note with KaTeX formulas
    const createNoteRes = await fetch(`${API_URL}/content/admin/notes`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        courseId: testCourse.id,
        moduleId: createdMod.id,
        title: {
          en: "Fundamental Theorem of Calculus",
          am: "የካልኩለስ መሰረታዊ ቲዎረም",
        },
        body: {
          en: "Let $f$ be continuous on $[a, b]$. Then $$\\int_a^b f(x)dx = F(b) - F(a)$$ where $F'(x) = f(x)$.",
          am: "ተግባር $f$ በ $[a, b]$ ላይ ቀጣይ ከሆነ: $$\\int_a^b f(x)dx = F(b) - F(a)$$ ይሆናል።",
        },
        isFree: true,
        status: "PUBLISHED",
      }),
    });
    const createdNote = (await createNoteRes.json()) as any;
    assert(createNoteRes.status === 201 && !!createdNote.id, "Admin creates bilingual published note with KaTeX formulas");

    // ----------------------------------------------------
    // 3. Student Content Delivery & Reader Integration
    // ----------------------------------------------------
    console.log("\n--- 3. Student Content Delivery & Reader Integration ---");
    const topicsRes = await fetch(`${API_URL}/content/courses/${testCourse.id}/topics`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    const topics = (await topicsRes.json()) as any[];
    assert(topicsRes.status === 200 && Array.isArray(topics) && topics.length > 0, "Student gets course topics list");

    // Validate that topics satisfy topicSchema contract
    const firstTopic = topics[0];
    const contractValidation = topicSchema.safeParse(firstTopic);
    assert(contractValidation.success, "Topic satisfies topicSchema contract (has id, courseId, kind, number, title, summary, body, isFree)");
    assert(typeof firstTopic.body?.en === "string" && typeof firstTopic.body?.am === "string", "Topic includes bilingual body (en & am)");

    // Test opening free trial topic
    const freeTopic = topics.find((t) => t.isFree) || firstTopic;
    const openFreeRes = await fetch(`${API_URL}/content/topics/${freeTopic.id}`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    const freeTopicDetail = (await openFreeRes.json()) as any;
    assert(openFreeRes.status === 200, "Student successfully opens free-trial topic");
    assert(!!freeTopicDetail.body?.en && !!freeTopicDetail.body?.am, "Topic detail provides full bilingual content");

    // Record reading progress
    const progressRes = await fetch(`${API_URL}/content/topics/${freeTopic.id}/progress`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${studentToken}`,
      },
      body: JSON.stringify({
        scrollPosition: 680,
        isCompleted: true,
      }),
    });
    const progressData = (await progressRes.json()) as any;
    assert(progressRes.status === 200 && progressData.success === true, "Student recorded reading progress (scroll=680, isCompleted=true)");

    // Verify progress reflects in topic detail
    const reOpenRes = await fetch(`${API_URL}/content/topics/${freeTopic.id}`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    const reOpenDetail = (await reOpenRes.json()) as any;
    assert(reOpenDetail.readingProgress?.scrollPosition === 680, "Recorded scroll position (680) persists in topic detail");
    assert(reOpenDetail.readingProgress?.isCompleted === true, "Recorded isCompleted (true) persists in topic detail");

    // ----------------------------------------------------
    // 4. Verify Database Storage Conservation for Audit Logs
    // ----------------------------------------------------
    console.log("\n--- 4. Verify DB Storage Conservation for Audit Logs ---");
    const finalAuditCount = await prisma.auditLog.count();
    assert(
      finalAuditCount === initialAuditCount,
      `Audit logs DB count unchanged (${initialAuditCount} -> ${finalAuditCount}): routine content actions dropped to conserve storage`,
    );

    console.log(`\n========================================`);
    console.log(`E2E Content Integration Results: ${passed} passed, ${failed} failed`);
    console.log(`========================================\n`);

    if (failed > 0) process.exit(1);
  } catch (err) {
    console.error("Test execution failed with exception:", err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runContentIntegrationSpec();
