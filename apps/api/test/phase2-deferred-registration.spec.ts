// apps/api/test/phase2-deferred-registration.spec.ts
import "reflect-metadata";
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  UnauthorizedException,
} from "@nestjs/common";
import { OrdersService } from "../src/modules/commerce/orders/services/orders.service";
import { PaymentProofsService } from "../src/modules/commerce/payment-proofs/services/payment-proofs.service";
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
import { hashClaimSecret } from "@mastara/domain";

describe("Phase 2: Deferred Registration, Gapless MS Counter & Secure Account Claiming (REG-07..14, PUR-01..08)", () => {
  const localAccountId = "550e8400-e29b-41d4-a716-446655440000";
  const claimSecret = "a".repeat(64);
  const claimSecretHash = hashClaimSecret(claimSecret);

  describe("1. Public Order Endpoint Protection & Takeover Prevention (REG-11, PUR-01..05)", () => {
    it("rejects receipt exceeding MAX_RECEIPT_BYTES (5 MB)", async () => {
      const mockPrisma: any = {};
      const mockPricing: any = {};
      const mockJwt: any = {};
      const service = new OrdersService(mockPrisma, mockPricing, mockJwt);

      await assert.rejects(
        () =>
          service.submitOrderWithLocal({
            localAccountId,
            fullName: "Abebe Bikila",
            identifier: "0911223344",
            password: "StrongPassword123!",
            claimSecretHash,
            type: ProductType.BUNDLE,
            stream: Stream.NATURAL,
            courseIds: ["course-1", "course-2"],
            method: PaymentMethod.CBE_MOBILE,
            reference: "FT24ABC123456",
            imageKey: "receipts/rec-1.jpg",
            imageSizeBytes: 6 * 1024 * 1024, // 6 MB > 5 MB
            imageMime: "image/jpeg",
          }),
        (err: any) => {
          assert.ok(err instanceof BadRequestException);
          assert.equal(err.getResponse().errorCode, "RECEIPT_TOO_LARGE");
          return true;
        },
      );
    });

    it("rejects invalid receipt MIME format (e.g. PDF or executable)", async () => {
      const mockPrisma: any = {};
      const mockPricing: any = {};
      const mockJwt: any = {};
      const service = new OrdersService(mockPrisma, mockPricing, mockJwt);

      await assert.rejects(
        () =>
          service.submitOrderWithLocal({
            localAccountId,
            fullName: "Abebe Bikila",
            identifier: "0911223344",
            password: "StrongPassword123!",
            claimSecretHash,
            type: ProductType.BUNDLE,
            stream: Stream.NATURAL,
            courseIds: ["course-1", "course-2"],
            method: PaymentMethod.CBE_MOBILE,
            reference: "FT24ABC123456",
            imageKey: "receipts/rec-1.pdf",
            imageSizeBytes: 1024 * 50,
            imageMime: "application/pdf",
          }),
        (err: any) => {
          assert.ok(err instanceof BadRequestException);
          assert.equal(err.getResponse().errorCode, "INVALID_RECEIPT_FORMAT");
          return true;
        },
      );
    });

    it("enforces maximum 2 pending orders limit per phone/email", async () => {
      const mockPrisma: any = {
        paymentProof: { findUnique: async () => null },
        order: { count: async () => 2 }, // already 2 pending
      };
      const mockPricing: any = {};
      const mockJwt: any = {};
      const service = new OrdersService(mockPrisma, mockPricing, mockJwt);

      await assert.rejects(
        () =>
          service.submitOrderWithLocal({
            localAccountId,
            fullName: "Abebe Bikila",
            identifier: "0911223344",
            password: "StrongPassword123!",
            claimSecretHash,
            type: ProductType.BUNDLE,
            stream: Stream.NATURAL,
            courseIds: ["course-1", "course-2"],
            method: PaymentMethod.CBE_MOBILE,
            reference: "FT24ABC123456",
            imageKey: "receipts/rec-1.jpg",
            imageSizeBytes: 1024 * 100,
            imageMime: "image/jpeg",
          }),
        (err: any) => {
          assert.ok(err instanceof BadRequestException);
          assert.equal(err.getResponse().errorCode, "TOO_MANY_PENDING_ORDERS");
          return true;
        },
      );
    });

    it("takeover protection (REG-11): requires login if phone/email belongs to an existing paid student", async () => {
      const existingStudentId = "existing-student-uuid";
      const mockPrisma: any = {
        paymentProof: { findUnique: async () => null },
        order: { count: async () => 0 },
        student: {
          findFirst: async () => ({ id: existingStudentId, phone: "+251911223344" }),
        },
      };
      const mockPricing: any = {};
      const mockJwt: any = {};
      const service = new OrdersService(mockPrisma, mockPricing, mockJwt);

      // Unauthenticated submission with registered phone
      await assert.rejects(
        () =>
          service.submitOrderWithLocal({
            localAccountId,
            fullName: "Imposter User",
            identifier: "0911223344",
            password: "NewPassword123!",
            claimSecretHash,
            type: ProductType.BUNDLE,
            stream: Stream.NATURAL,
            courseIds: ["course-1", "course-2"],
            method: PaymentMethod.CBE_MOBILE,
            reference: "FT24ABC123456",
            imageKey: "receipts/rec-1.jpg",
            imageSizeBytes: 1024 * 100,
            imageMime: "image/jpeg",
          }),
        (err: any) => {
          assert.ok(err instanceof ForbiddenException);
          assert.equal(err.getResponse().errorCode, "ACCOUNT_EXISTS_LOGIN_REQUIRED");
          return true;
        },
      );
    });

    it("purchase eligibility (PUR-01, PUR-04): rejects single-course payment from unregistered student", async () => {
      const mockPrisma: any = {
        paymentProof: { findUnique: async () => null },
        order: { count: async () => 0 },
        student: { findFirst: async () => null }, // unregistered
        systemSetting: { findUnique: async () => null },
      };
      const mockPricing: any = {};
      const mockJwt: any = {};
      const service = new OrdersService(mockPrisma, mockPricing, mockJwt);

      await assert.rejects(
        () =>
          service.submitOrderWithLocal({
            localAccountId,
            fullName: "Abebe Bikila",
            identifier: "0911223344",
            password: "StrongPassword123!",
            claimSecretHash,
            type: ProductType.SINGLE,
            stream: Stream.NATURAL,
            courseIds: ["course-1"],
            method: PaymentMethod.CBE_MOBILE,
            reference: "FT24ABC123456",
            imageKey: "receipts/rec-1.jpg",
            imageSizeBytes: 1024 * 100,
            imageMime: "image/jpeg",
          }),
        (err: any) => {
          assert.ok(err instanceof BadRequestException);
          assert.equal(err.getResponse().errorCode, "BUNDLE_REQUIRED");
          return true;
        },
      );
    });
  });

  describe("2. Atomic Gapless MS Counter & Student Creation at Approval (REG-07, REG-08, REG-14)", () => {
    it("creates student with MS0001 sequence and device binding upon manual receipt approval", async () => {
      const proofId = "proof-uuid-1";
      const orderId = "order-uuid-1";
      let createdStudentData: any = null;
      let createdBindingData: any = null;
      let orderUpdatedStudentId: string | null = null;
      let createdEntitlements: any[] = [];

      const mockOrder: any = {
        id: orderId,
        student_id: null, // unregistered local student
        local_account_id: localAccountId,
        claim_secret_hash: claimSecretHash,
        pending_name: "Kalkidan Tesfaye",
        pending_phone: "+251922334455",
        pending_email: null,
        pending_password_hash: "$2b$10$hashedPasswordSample",
        status: OrderStatus.PENDING_PAYMENT,
        items: [{ course_id: "course-1" }, { course_id: "course-2" }],
        student: null,
      };

      const mockProof: any = {
        id: proofId,
        order_id: orderId,
        status: ProofStatus.PENDING,
        order: mockOrder,
      };

      const mockTx: any = {
        student: {
          findUnique: async () => null,
          findFirst: async () => null,
          create: async ({ data }: any) => {
            createdStudentData = data;
            return { id: data.id || "new-student-id", ...data };
          },
        },
        $queryRawUnsafe: async (sql: string) => {
          assert.ok(sql.includes("student_ms_code"));
          return [{ value: 1 }]; // Counter returns 1 -> MS0001
        },
        deviceBinding: {
          create: async ({ data }: any) => {
            createdBindingData = data;
            return { id: "binding-id", ...data };
          },
        },
        securityEventLog: {
          create: async () => ({ id: "log-id" }),
        },
        order: {
          update: async ({ data }: any) => {
            if (data.student_id) orderUpdatedStudentId = data.student_id;
            return { ...mockOrder, ...data };
          },
        },
        paymentProof: {
          update: async ({ data }: any) => ({ ...mockProof, ...data }),
        },
        entitlement: {
          create: async ({ data }: any) => {
            createdEntitlements.push(data);
            return { id: "ent-id", ...data };
          },
        },
        studentCourse: {
          upsert: async () => ({ id: "sc-id" }),
        },
        notification: {
          create: async () => ({ id: "notif-id" }),
        },
      };

      const mockPrisma: any = {
        paymentProof: {
          findUnique: async () => mockProof,
        },
        $transaction: async (cb: any) => cb(mockTx),
      };

      const mockAudit: any = { log: async () => {} };
      const mockPush: any = { sendToStudent: async () => {} };
      const service = new PaymentProofsService(mockPrisma, mockAudit, mockPush);

      await service.approveProof("admin-uuid", proofId, 150);

      // Assertions
      assert.ok(createdStudentData);
      assert.equal(createdStudentData.student_number, 1);
      assert.equal(createdStudentData.student_code, "MS0001");
      assert.equal(createdStudentData.first_name, "Kalkidan");
      assert.equal(createdStudentData.last_name, "Tesfaye");
      assert.equal(createdStudentData.password_hash, "$2b$10$hashedPasswordSample");
      assert.equal(createdStudentData.id, localAccountId); // Preserves local ID

      assert.ok(createdBindingData);
      assert.equal(createdBindingData.status, "ACTIVE");

      assert.equal(orderUpdatedStudentId, localAccountId);
      assert.equal(createdEntitlements.length, 2);
    });

    it("idempotency (REG-10): retrying approval returns existing student without creating duplicate MS number", async () => {
      const proofId = "proof-uuid-retry";
      const orderId = "order-uuid-retry";
      let rawSqlInvoked = false;

      const existingStudent = {
        id: localAccountId,
        student_number: 1,
        student_code: "MS0001",
        first_name: "Kalkidan",
        last_name: "Tesfaye",
      };

      const mockOrder: any = {
        id: orderId,
        student_id: null,
        local_account_id: localAccountId,
        claim_secret_hash: claimSecretHash,
        status: OrderStatus.PENDING_PAYMENT,
        items: [{ course_id: "course-1" }],
        student: null,
      };

      const mockProof: any = {
        id: proofId,
        order_id: orderId,
        status: ProofStatus.PENDING,
        order: mockOrder,
      };

      const mockTx: any = {
        student: {
          findUnique: async () => existingStudent, // Found by localAccountId
        },
        $queryRawUnsafe: async () => {
          rawSqlInvoked = true;
          return [{ value: 2 }];
        },
        order: { update: async () => mockOrder },
        paymentProof: { update: async () => mockProof },
        entitlement: { create: async () => ({ id: "ent" }) },
        studentCourse: { upsert: async () => ({ id: "sc" }) },
        notification: { create: async () => ({ id: "notif" }) },
      };

      const mockPrisma: any = {
        paymentProof: { findUnique: async () => mockProof },
        $transaction: async (cb: any) => cb(mockTx),
      };

      const service = new PaymentProofsService(mockPrisma, { log: async () => {} } as any, { sendToStudent: async () => {} } as any);
      await service.approveProof("admin-uuid", proofId, 150);

      // Raw counter SQL must NOT be called because student already exists!
      assert.equal(rawSqlInvoked, false);
    });
  });

  describe("3. Account Claim Protocol (REG-10, REG-12, REG-14)", () => {
    it("rejects claim attempt when order is still in PENDING_PAYMENT status", async () => {
      const mockPrisma: any = {
        order: {
          findUnique: async () => ({
            id: "order-1",
            status: OrderStatus.PENDING_PAYMENT,
            claim_secret_hash: claimSecretHash,
          }),
        },
      };
      const service = new OrdersService(mockPrisma, {} as any, {} as any);

      await assert.rejects(
        () => service.claimOrder("order-1", claimSecret),
        (err: any) => {
          assert.ok(err instanceof BadRequestException);
          assert.equal(err.getResponse().errorCode, "ORDER_NOT_APPROVED");
          return true;
        },
      );
    });

    it("rejects claim attempt with wrong claim secret (HTTP 401)", async () => {
      const mockPrisma: any = {
        order: {
          findUnique: async () => ({
            id: "order-1",
            status: OrderStatus.APPROVED,
            claim_secret_hash: claimSecretHash,
          }),
        },
      };
      const service = new OrdersService(mockPrisma, {} as any, {} as any);

      await assert.rejects(
        () => service.claimOrder("order-1", "b".repeat(64)), // wrong secret
        (err: any) => {
          assert.ok(err instanceof UnauthorizedException);
          assert.equal(err.getResponse().errorCode, "INVALID_CLAIM_SECRET");
          return true;
        },
      );
    });

    it("grants MS number and signed JWT token upon valid claim presentation", async () => {
      const mockStudent = {
        id: localAccountId,
        student_code: "MS0001",
        role: Role.STUDENT,
        email: "student@mastara.edu.et",
        phone: "+251911223344",
      };

      const mockPrisma: any = {
        order: {
          findUnique: async () => ({
            id: "order-1",
            status: OrderStatus.APPROVED,
            claim_secret_hash: claimSecretHash,
            student: mockStudent,
          }),
        },
      };

      const mockJwt: any = {
        sign: (payload: any) => (payload.type === "refresh" ? "mock-refresh-token" : "mock-access-token"),
      };

      const service = new OrdersService(mockPrisma, {} as any, mockJwt);
      const result = await service.claimOrder("order-1", claimSecret);

      assert.equal(result.studentId, localAccountId);
      assert.equal(result.studentCode, "MS0001");
      assert.equal(result.token, "mock-access-token");
      assert.equal(result.refreshToken, "mock-refresh-token");
    });
  });

  describe("4. Payment Settings Controls (PUR-08, ADM-03)", () => {
    it("retrieves and updates single_courses_enabled and pricing overrides", async () => {
      let storedSettings: any = null;

      const mockPrisma: any = {
        systemSetting: {
          findUnique: async () => storedSettings,
          upsert: async ({ create, update }: any) => {
            storedSettings = { key: "payment_settings", value: update?.value || create?.value };
            return storedSettings;
          },
        },
      };

      const service = new OrdersService(mockPrisma, {} as any, {} as any);

      // Default state when nothing in DB
      const defaults = await service.getPaymentSettings();
      assert.equal(defaults.singleCoursesEnabled, true);

      // Admin disables single courses
      await service.updatePaymentSettings("admin-uuid", {
        singleCoursesEnabled: false,
        bundlePrices: { BUNDLE: 500 },
        singleCoursePrices: { "course-1": 75 },
      });

      const updated = await service.getPaymentSettings();
      assert.equal(updated.singleCoursesEnabled, false);
      assert.equal(updated.bundlePrices?.BUNDLE, 500);
      assert.equal(updated.singleCoursePrices?.["course-1"], 75);
    });
  });
});
