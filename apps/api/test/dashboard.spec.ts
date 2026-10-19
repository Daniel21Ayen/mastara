import "reflect-metadata";
import { Role, StudentStatus, ProofStatus, EntitlementStatus, PublicationStatus, ScanJobStatus } from "@mastara/database";
import { DASHBOARD_TREND_DAYS, DASHBOARD_RECENT_LIMIT } from "@mastara/domain";
import { dashboardSummarySchema } from "@mastara/contracts";
import { DashboardService } from "../src/modules/platform/dashboard/services/dashboard.service";

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

async function runDashboardTests() {
  console.log("=== Testing Dashboard Service & Contract Alignment ===\n");

  const now = new Date();

  // Mock Prisma Service
  const mockPrisma: any = {
    student: {
      count: async ({ where }: any) => {
        if (where.role === Role.STUDENT && where.status === StudentStatus.ACTIVE) {
          return 42;
        }
        return 0;
      },
      findMany: async () => [
        { created_at: new Date(now.getTime() - 1 * 86400000) },
        { created_at: new Date(now.getTime() - 1 * 86400000) },
        { created_at: new Date(now.getTime() - 2 * 86400000) },
      ],
    },
    paymentProof: {
      count: async ({ where }: any) => {
        if (where.status === ProofStatus.PENDING) {
          return 5;
        }
        return 0;
      },
    },
    entitlement: {
      count: async ({ where }: any) => {
        if (where.expires_at?.lte) {
          return 3; // expiring soon
        }
        return 28; // active
      },
    },
    course: {
      count: async () => 2,
    },
    module: {
      count: async () => 4,
    },
    scanJob: {
      count: async () => 1,
    },
    auditLog: {
      findMany: async () => [
        {
          id: "audit-001",
          actor_id: "admin-uuid-1",
          actor_role: Role.ADMIN,
          action: "PAYMENT_APPROVED",
          target_type: "Order",
          target_id: "order-uuid-9999",
          metadata: { target: "Order ORD-2026-001", reason: "Verified CBE receipt" },
          created_at: new Date(),
        },
      ],
    },
  };

  const dashboardService = new DashboardService(mockPrisma);

  console.log("1. DashboardService Summary Aggregation Tests:");
  const summary = await dashboardService.getSummary();

  assert(summary.activeStudents === 42, "Aggregates active students count (42)");
  assert(summary.pendingPayments === 5, "Aggregates pending payments count (5)");
  assert(summary.activeEntitlements === 28, "Aggregates active entitlements count (28)");
  assert(summary.expiringSoon === 3, "Aggregates expiring soon entitlements within renewal window (3)");

  console.log("\n2. Registration Trend Tests:");
  assert(summary.newStudents.length === DASHBOARD_TREND_DAYS, `Generates exactly ${DASHBOARD_TREND_DAYS} days trend`);
  assert(summary.newStudents.every((d) => /^\d{4}-\d{2}-\d{2}$/.test(d.date)), "Formats dates as YYYY-MM-DD");
  assert(summary.newStudents.every((d) => typeof d.count === "number" && d.count >= 0), "Counts are non-negative integers");

  console.log("\n3. Attention Panel & Activity Tests:");
  assert(summary.attention.paymentsWaiting === 5, "Reflects pending payments in attention panel");
  assert(summary.attention.contentInDraft === 6, "Calculates content in draft (courses + modules: 2 + 4 = 6)");
  assert(summary.attention.scanJobsFailed === 1, "Reflects failed scan jobs (1)");
  assert(summary.recentActivity.length === 1, "Returns recent activity feed");
  assert(summary.recentActivity[0]?.action === "PAYMENT_APPROVED", "Maps audit action correctly");
  assert(summary.recentActivity[0]?.actor === "ADMIN", "Maps actor role correctly");

  console.log("\n4. Contract Alignment Schema Validation:");
  const parseResult = dashboardSummarySchema.safeParse(summary);
  assert(parseResult.success, "Payload strictly satisfies Zod dashboardSummarySchema", parseResult.error);

  console.log(`\n========================================`);
  console.log(`Dashboard Tests: ${passed} passed, ${failed} failed.`);
  console.log(`========================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runDashboardTests().catch((err) => {
  console.error("Dashboard test execution error:", err);
  process.exit(1);
});
