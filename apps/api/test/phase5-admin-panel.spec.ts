// apps/api/test/phase5-admin-panel.spec.ts
import "reflect-metadata";
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from "@nestjs/common";
import { StudentsService } from "../src/modules/identity/students/services/students.service";
import { DashboardService } from "../src/modules/platform/dashboard/services/dashboard.service";
import { ReportsService } from "../src/modules/platform/reports/services/reports.service";
import { PaymentProofsService } from "../src/modules/commerce/payment-proofs/services/payment-proofs.service";
import { CatalogService } from "../src/modules/catalog/services/catalog.service";
import { PricingService } from "../src/modules/commerce/pricing/services/pricing.service";
import {
  OrderStatus,
  PaymentMethod,
  ProductType,
  ProofStatus,
  PublicationStatus,
  Role,
  Stream,
  StudentStatus,
} from "@mastara/database";

describe("Phase 5: Admin Panel — Paid-Only Students, Receipt Approvals, Versioning & Settings (ADM-01..04)", () => {
  const adminId = "admin-uuid-super-1";

  describe("1. ADM-01: Paid-Only Student Directory, KPIs & Reports", () => {
    it("listAdminStudents restricts query to students with non-null student_code", async () => {
      let capturedWhere: any = null;
      const mockPrisma: any = {
        student: {
          count: async ({ where }: any) => {
            capturedWhere = where;
            return 1;
          },
          findMany: async ({ where }: any) => {
            capturedWhere = where;
            return [
              {
                id: "student-1",
                student_number: 1,
                student_code: "MS0001",
                first_name: "Dawit",
                last_name: "Tsige",
                phone: "0911223344",
                email: "dawit@example.com",
                status: StudentStatus.ACTIVE,
                created_at: new Date(),
                university: { code: "AAU" },
                program: { name_en: "Pre-Engineering" },
                semester: { sort_order: 1 },
                device_binding: null,
                courses: [],
                entitlements: [],
                orders: [],
              },
            ];
          },
        },
      };

      const mockAudit: any = {};
      const service = new StudentsService(mockPrisma, mockAudit);
      const result = await service.listAdminStudents({ page: 1, pageSize: 10 });

      assert.equal(result.items.length, 1);
      assert.deepEqual(capturedWhere.student_code, { not: null }, "Where condition must enforce student_code not null");
      assert.equal(capturedWhere.role, Role.STUDENT);
    });

    it("DashboardService.getSummary activeStudents KPI only counts paid students", async () => {
      let capturedCountWhere: any = null;
      const mockPrisma: any = {
        student: {
          count: async ({ where }: any) => {
            capturedCountWhere = where;
            return 42;
          },
          findMany: async () => [],
        },
        paymentProof: {
          count: async () => 3,
        },
        entitlement: {
          count: async () => 40,
        },
        course: { count: async () => 0 },
        module: { count: async () => 0 },
        scanJob: { count: async () => 0 },
        auditLog: { findMany: async () => [] },
      };

      const service = new DashboardService(mockPrisma);
      const summary = await service.getSummary();

      assert.equal(summary.activeStudents, 42);
      assert.deepEqual(
        capturedCountWhere.student_code,
        { not: null },
        "activeStudents KPI query must enforce student_code not null",
      );
    });

    it("ReportsService counts only paid students with student_code", async () => {
      const capturedStudentCountWheres: any[] = [];
      const mockPrisma: any = {
        student: {
          count: async (arg?: { where?: any }) => {
            capturedStudentCountWheres.push(arg?.where);
            return 10;
          },
        },
        order: { findMany: async () => [] },
        paymentProof: { findMany: async () => [] },
        course: { findMany: async () => [] },
        attempt: { findMany: async () => [] },
        auditLog: { findMany: async () => [] },
      };

      const service = new ReportsService(mockPrisma);
      await service.getPlatformReports();

      assert.equal(capturedStudentCountWheres.length, 3);
      for (const where of capturedStudentCountWheres) {
        assert.deepEqual(
          where.student_code,
          { not: null },
          "Reports student counts must enforce student_code not null",
        );
      }
    });
  });

  describe("2. ADM-02: Receipt Approval Queue & Phone/Code Visibility", () => {
    it("maps unregistered order details (pending name, phone, email) to AdminPaymentDto", async () => {
      const mockProof = {
        id: "proof-101",
        order_id: "order-101",
        method: "CBE_MOBILE",
        transaction_reference: "FT24REF101",
        status: ProofStatus.PENDING,
        reject_reason: null,
        created_at: new Date(),
        reviewed_at: null,
        order: {
          id: "order-101",
          student_id: null,
          local_account_id: "uuid-local-1",
          pending_name: "Almaz Kebede",
          pending_phone: "0912345678",
          pending_email: "almaz@test.com",
          quoted_amount: 250,
          stream: "NATURAL",
          product: { type: "BUNDLE", duration_days: 150 },
          items: [],
          student: null,
        },
      };

      const mockPrisma: any = {
        paymentProof: {
          count: async () => 1,
          findMany: async () => [mockProof],
        },
      };
      const mockAudit: any = {};
      const mockConfig: any = {};
      const mockPush: any = {};

      const service = new PaymentProofsService(mockPrisma as any, mockAudit, mockPush);
      const result = await service.getAdminPayments({ status: "PENDING" as any });

      assert.equal(result.items.length, 1);
      const item = result.items[0];
      assert.ok(item);
      assert.equal(item.studentName, "Almaz Kebede");
      assert.equal(item.studentPhone, "0912345678");
      assert.equal(item.studentEmail, "almaz@test.com");
      assert.equal(item.studentCode, null, "Unregistered order has no studentCode before approval");
    });

    it("rejecting payment requires a reason", async () => {
      const mockPrisma: any = {
        paymentProof: {
          findFirst: async () => ({
            id: "proof-102",
            status: ProofStatus.PENDING,
            order: { product: null },
          }),
        },
      };
      const service = new PaymentProofsService(mockPrisma as any, {} as any, {} as any);

      await assert.rejects(
        () => service.decidePayment(adminId, "proof-102", { action: "REJECT" as any }),
        (err: any) => err instanceof BadRequestException,
      );
    });
  });

  describe("3. ADM-03: Course Content Version Management", () => {
    it("updateAdminCourse increments content_version on course modifications", async () => {
      let updatedData: any = null;
      const mockPrisma: any = {
        course: {
          findUnique: async () => ({
            id: "c-101",
            semester_id: "sem-1",
            status: PublicationStatus.PUBLISHED,
          }),
          findFirst: async () => null,
          update: async ({ data }: any) => {
            updatedData = data;
            return {
              id: "c-101",
              semester_id: "sem-1",
              code: "MATH101",
              title_en: "Calculus I",
              stream: Stream.NATURAL,
              accent: "blue",
              icon: "calculator",
              free_access: false,
              is_promotional: false,
              trial_expiry_days: 0,
              content_version: 2,
              status: PublicationStatus.PUBLISHED,
              semester: {
                sort_order: 1,
                code: "SEM1",
                program: { id: "p-1", name_en: "Engineering", university: { id: "u-1", code: "AAU" } },
              },
            };
          },
        },
      };

      const mockAudit: any = { log: async () => {} };
      const service = new CatalogService(mockPrisma, mockAudit);

      const result = await service.updateAdminCourse(adminId, "c-101", {
        code: "MATH101",
        title: "Calculus I",
        stream: "NATURAL",
        status: "PUBLISHED",
        freeTrialItems: 0,
      });

      assert.deepEqual(updatedData.content_version, { increment: 1 });
      assert.equal(result.contentVersion, 2);
    });

    it("bumpCourseContentVersion increments version and records audit event", async () => {
      let auditEvent: any = null;
      const mockPrisma: any = {
        course: {
          update: async ({ data }: any) => ({
            id: "c-102",
            code: "PHYS101",
            content_version: 3,
            semester: {
              code: "SEM1",
              program: { university: { code: "AAU" } },
            },
          }),
        },
      };
      const mockAudit: any = {
        log: async (event: any) => {
          auditEvent = event;
        },
      };

      const service = new CatalogService(mockPrisma, mockAudit);
      const res = await service.bumpCourseContentVersion(adminId, "c-102");

      assert.equal(res.contentVersion, 3);
      assert.equal(auditEvent.action, "COURSE_VERSION_BUMPED");
      assert.equal(auditEvent.metadata.newVersion, 3);
    });
  });

  describe("4. ADM-04: Payment Settings & Single-Course Toggle", () => {
    it("reads and updates allowSingleCourses toggle and bank deposit accounts", async () => {
      const settingsStore = new Map<string, any>();

      const mockPrisma: any = {
        product: {
          findMany: async () => [
            { id: "prod-bundle", type: ProductType.BUNDLE, price_etb: 200, duration_days: 150, min_courses: 7, max_courses: 10 },
            { id: "prod-single", type: ProductType.SINGLE, price_etb: 60, duration_days: 120 },
            { id: "prod-stream", type: ProductType.FULL_STREAM, price_etb: 350, duration_days: 365 },
            { id: "prod-both", type: ProductType.FULL_BOTH, price_etb: 700, duration_days: 365 },
          ],
          findFirst: async () => null,
          updateMany: async () => {},
        },
        priceRule: { findMany: async () => [] },
        systemSetting: {
          findUnique: async ({ where }: any) => {
            const val = settingsStore.get(where.key);
            return val ? { key: where.key, value: val } : null;
          },
          upsert: async ({ where, create, update }: any) => {
            const val = update?.value ?? create?.value;
            settingsStore.set(where.key, val);
            return { key: where.key, value: val };
          },
        },
      };

      const mockConfig: any = {
        get: (key: string, def: string) => def,
      };
      const mockAudit: any = { log: async () => {} };

      const service = new PricingService(mockPrisma, mockConfig, mockAudit);

      // Default: allowSingleCourses is true
      const initial = await service.getAdminPricingSettings();
      assert.equal(initial.allowSingleCourses, true);

      // Admin disables single course purchases and configures deposit accounts
      await service.updateAdminPricingSettings(adminId, {
        allowSingleCourses: false,
        bankAccounts: {
          cbeAccount: "1000999888777",
          telebirrMerchantId: "TB-998877",
          cbeBirr: "0999887766",
        },
      });

      // Verify updated settings reflect new state
      const updated = await service.getAdminPricingSettings();
      assert.equal(updated.allowSingleCourses, false);
      assert.equal(updated.bankAccounts?.cbeAccount, "1000999888777");
      assert.equal(updated.bankAccounts?.telebirrMerchantId, "TB-998877");

      // Verify public getAccounts returns custom bank credentials
      const publicAccounts = await service.getAccounts();
      assert.equal(publicAccounts.CBE_MOBILE, "1000999888777");
      assert.equal(publicAccounts.TELEBIRR, "TB-998877");
      assert.equal(publicAccounts.CBE_BIRR, "0999887766");
    });
  });
});
