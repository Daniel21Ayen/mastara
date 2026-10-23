// apps/api/test/attention-audit.spec.ts
import "dotenv/config";
import { Role } from "@mastara/database";
import {
  ATTENTION_AUDIT_ACTIONS,
  isAttentionAuditAction,
} from "@mastara/domain";
import { AuditService } from "../src/modules/platform/audit/services/audit.service";
import { PrismaService } from "../src/infrastructure/database/prisma.service";

async function runAttentionAuditSpec() {
  console.log("=== Testing Attention-Only Audit Log System (Limited Storage Mode) ===\n");

  const API_URL = "http://localhost:3000/api/v1";
  const prismaService = new PrismaService();
  const auditService = new AuditService(prismaService);

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
    console.log("--- 1. Authenticate Admin and Student ---");
    const adminLoginRes = await fetch(`${API_URL}/auth/admin/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        identifier: "admin@mastara.edu.et",
        password: "password123",
      }),
    });
    const adminAuth = (await adminLoginRes.json()) as any;
    assert(adminLoginRes.status === 200 && !!adminAuth.token, "Admin authenticated with JWT token");
    const adminToken = adminAuth.token;
    const adminId = adminAuth.user.id;

    const studentLoginRes = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        identifier: "student@mastara.edu.et",
        password: "password123",
      }),
    });
    const studentAuth = (await studentLoginRes.json()) as any;
    assert(studentLoginRes.status === 200 && !!studentAuth.token, "Student authenticated");
    const studentToken = studentAuth.token;

    // ----------------------------------------------------
    // 2. Authorization Guards
    // ----------------------------------------------------
    console.log("\n--- 2. Route Protection & Authorization ---");
    const studentAccessRes = await fetch(`${API_URL}/platform/admin/audit`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert(
      studentAccessRes.status === 403,
      "Student access to /platform/admin/audit returns 403 Forbidden",
    );

    const unauthAccessRes = await fetch(`${API_URL}/platform/admin/audit`);
    assert(
      unauthAccessRes.status === 401,
      "Unauthenticated access returns 401 Unauthorized",
    );

    // ----------------------------------------------------
    // 3. Storage Conservation: Non-Attention Actions are Dropped
    // ----------------------------------------------------
    console.log("\n--- 3. Storage Conservation (Dropping Non-Attention Actions) ---");
    const countBefore = await prismaService.auditLog.count();

    // Routine actions that must be ignored to save DB space
    const routineActions = [
      "PAYMENT_APPROVED",
      "COURSE_CREATED",
      "STUDENT_ADDED",
      "CONTENT_PUBLISHED",
      "EXAM_PUBLISHED",
      "SUPPORT_TICKET_REPLIED",
    ];

    for (const routineAction of routineActions) {
      assert(
        !isAttentionAuditAction(routineAction),
        `Action '${routineAction}' is correctly categorized as NON-attention`,
      );

      await auditService.log({
        actorId: adminId,
        actorRole: Role.ADMIN,
        action: routineAction,
        targetType: "Course",
        targetId: "c-100",
        metadata: { target: "Routine Operation", reason: "Standard flow" },
      });
    }

    const countAfterRoutine = await prismaService.auditLog.count();
    assert(
      countAfterRoutine === countBefore,
      `Zero routine actions were written to database (count remained ${countBefore})`,
    );

    // ----------------------------------------------------
    // 4. Attention Actions are Persisted to DB
    // ----------------------------------------------------
    console.log("\n--- 4. Attention Actions Persistence ---");
    const attentionActionsToTest = [
      {
        action: "PAYMENT_REJECTED",
        targetType: "PaymentProof",
        targetId: "proof-test-01",
        metadata: {
          target: "Order ORD-1001 · Kebede Kassahun",
          reason: "Payment slip was illegible and missing reference code",
        },
      },
      {
        action: "DEVICE_REVOKED",
        targetType: "Student",
        targetId: "student-dev-02",
        metadata: {
          target: "Student ST-889 · Samsung Galaxy A52",
          reason: "Student reported phone was stolen",
        },
      },
      {
        action: "STUDENT_SUSPENDED",
        targetType: "Student",
        targetId: "student-sus-03",
        metadata: {
          target: "Student ST-442 · Almaz Tesfaye",
          reason: "Detected simultaneous test sessions across multiple cities",
        },
      },
      {
        action: "ACCESS_EXTENDED",
        targetType: "Student",
        targetId: "student-acc-04",
        metadata: {
          target: "Student ST-109 · Freshman Calculus I",
          reason: "Bank transaction delay verified by CBE",
        },
      },
      {
        action: "PRICE_CHANGED",
        targetType: "Product",
        targetId: "prod-bundle-05",
        metadata: {
          target: "Semester Bundle (7-10 Courses)",
          reason: "Mid-semester discount campaign approved by finance",
        },
      },
    ];

    for (const item of attentionActionsToTest) {
      assert(
        isAttentionAuditAction(item.action),
        `Action '${item.action}' is correctly identified as ATTENTION_AUDIT_ACTION`,
      );

      await auditService.log({
        actorId: adminId,
        actorRole: Role.ADMIN,
        action: item.action,
        targetType: item.targetType,
        targetId: item.targetId,
        metadata: item.metadata,
      });
    }

    const countAfterAttention = await prismaService.auditLog.count();
    assert(
      countAfterAttention >= countBefore + attentionActionsToTest.length,
      `All 5 attention actions were successfully persisted (count: ${countAfterAttention})`,
    );

    // ----------------------------------------------------
    // 5. Query Live API: GET /platform/admin/audit
    // ----------------------------------------------------
    console.log("\n--- 5. Query Live API GET /platform/admin/audit ---");
    const auditRes = await fetch(`${API_URL}/platform/admin/audit`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(auditRes.status === 200, "GET /platform/admin/audit returns 200 OK");
    const logs = (await auditRes.json()) as any[];
    assert(Array.isArray(logs) && logs.length > 0, "Audit logs array returned with entries");

    // Every returned log must be an attention action
    const allAreAttention = logs.every((entry) =>
      ATTENTION_AUDIT_ACTIONS.includes(entry.action as any),
    );
    assert(allAreAttention, "Every returned audit log entry requires admin attention");

    // Check schema fields
    const sample = logs[0];
    assert(!!sample.id, "Audit entry has unique 'id'");
    assert(!!sample.at, "Audit entry has ISO timestamp 'at'");
    assert(sample.actor === "ADMIN" || sample.actor === "STUDENT" || sample.actor === "SYSTEM", "Audit entry has valid 'actor'");
    assert(!!sample.action, "Audit entry has valid 'action'");
    assert(!!sample.target, "Audit entry has descriptive 'target'");

    // ----------------------------------------------------
    // 6. Category, Actor & Query Filtering
    // ----------------------------------------------------
    console.log("\n--- 6. Filter Parameters Validation ---");

    // Filter by actionGroup=PAYMENTS
    const paymentsRes = await fetch(`${API_URL}/platform/admin/audit?actionGroup=PAYMENTS`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const paymentLogs = (await paymentsRes.json()) as any[];
    assert(
      paymentLogs.every((e) => e.action.startsWith("PAYMENT_")),
      "Filter actionGroup=PAYMENTS returns only payment rejection actions",
    );

    // Filter by actionGroup=SECURITY
    const securityRes = await fetch(`${API_URL}/platform/admin/audit?actionGroup=SECURITY`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const securityLogs = (await securityRes.json()) as any[];
    assert(
      securityLogs.every(
        (e) => e.action === "DEVICE_REVOKED" || e.action === "STUDENT_SUSPENDED",
      ),
      "Filter actionGroup=SECURITY returns only device revoke or student suspend",
    );

    // Filter by query search
    const queryRes = await fetch(`${API_URL}/platform/admin/audit?query=stolen`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const queryLogs = (await queryRes.json()) as any[];
    assert(
      queryLogs.length > 0 && queryLogs.some((e) => e.reason?.includes("stolen")),
      "Text search 'query=stolen' correctly finds reason/target matches",
    );

    // Filter by range=TODAY
    const todayRes = await fetch(`${API_URL}/platform/admin/audit?range=TODAY`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const todayLogs = (await todayRes.json()) as any[];
    assert(todayLogs.length > 0, "Filter range=TODAY returns recent logs");

    // ----------------------------------------------------
    // 7. Recent Attention Items: GET /platform/admin/audit/attention
    // ----------------------------------------------------
    console.log("\n--- 7. Profile Drawer: GET /platform/admin/audit/attention ---");
    const attentionRes = await fetch(`${API_URL}/platform/admin/audit/attention`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(attentionRes.status === 200, "GET /platform/admin/audit/attention returns 200 OK");
    const attentionList = (await attentionRes.json()) as any[];
    assert(
      Array.isArray(attentionList) && attentionList.length <= 8,
      `Attention drawer returns max 8 items (returned ${attentionList.length})`,
    );
    assert(
      attentionList.every((e) => ATTENTION_AUDIT_ACTIONS.includes(e.action as any)),
      "Every profile drawer entry is an attention-required item",
    );

    // ----------------------------------------------------
    // Summary
    // ----------------------------------------------------
    console.log(`\n========================================`);
    console.log(`Passed: ${passed}`);
    console.log(`Failed: ${failed}`);
    console.log(`========================================\n`);

    if (failed > 0) {
      process.exit(1);
    }
  } finally {
    await prismaService.$disconnect();
  }
}

void runAttentionAuditSpec();
