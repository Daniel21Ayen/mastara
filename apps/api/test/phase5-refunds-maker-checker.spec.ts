// apps/api/test/phase5-refunds-maker-checker.spec.ts
import "reflect-metadata";
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ForbiddenException, ConflictException, NotFoundException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { ContentService } from "../src/modules/content/services/content.service";
import { PaymentProofsService } from "../src/modules/commerce/payment-proofs/services/payment-proofs.service";
import { PermissionsGuard } from "../src/common/guards/permissions.guard";
import { PERMISSIONS_KEY } from "../src/common/decorators/require-permission.decorator";
import { EntitlementStatus, OrderStatus, ProofStatus } from "@mastara/database";

describe("Phase 5: Financial Workflows, Content Publishing & Audit Trail (FR-G62, FR-G64)", () => {
  describe("Maker-Checker Enforcement (FR-G62)", () => {
    it("blocks an author from publishing their own module with HTTP 403", async () => {
      const adminAuthorId = "admin-author-uuid";
      const adminReviewerId = "admin-reviewer-uuid";
      const moduleId = "mod-uuid-1";

      const auditLogs: any[] = [
        {
          target_type: "Module",
          target_id: moduleId,
          action: "MODULE_CREATED",
          actor_id: adminAuthorId,
          created_at: new Date(Date.now() - 10000),
        },
      ];

      const mockPrisma: any = {
        module: {
          findUnique: async () => ({
            id: moduleId,
            status: "DRAFT",
            course: { code: "MATH101" },
            topics: [],
          }),
          update: async ({ data }: any) => ({
            id: moduleId,
            status: data.status,
            title_en: data.title_en,
            title_am: data.title_am,
            sort_order: 1,
            course_id: "course-1",
            updated_at: new Date(),
            topics: [],
          }),
        },
        auditLog: {
          findFirst: async ({ where }: any) => {
            return auditLogs.find(
              (l) =>
                l.target_type === where.target_type &&
                l.target_id === where.target_id &&
                l.action === where.action &&
                (!where.actor_id || l.actor_id === where.actor_id),
            );
          },
        },
      };

      const mockAuditService: any = {
        log: async (event: any) => {
          auditLogs.push({
            target_type: event.targetType,
            target_id: event.targetId,
            action: event.action,
            actor_id: event.actorId,
          });
        },
      };

      const contentService = new ContentService(mockPrisma, mockAuditService, null as any);

      // 1. Author attempts to publish their own module -> MUST THROW 403
      await assert.rejects(
        async () => {
          await contentService.updateAdminModule(
            moduleId,
            {
              title: { en: "Updated Title", am: "ርዕስ" },
              status: "PUBLISHED" as any,
              courseId: "course-1",
            },
            adminAuthorId,
          );
        },
        (err: any) => {
          assert(err instanceof ForbiddenException);
          assert.match(err.message, /Maker–checker policy violation/);
          return true;
        },
      );

      // 2. Different reviewer publishes -> SUCCEEDS
      const published = await contentService.updateAdminModule(
        moduleId,
        {
          title: { en: "Updated Title", am: "ርዕስ" },
          status: "PUBLISHED" as any,
          courseId: "course-1",
        },
        adminReviewerId,
      );

      assert.equal(published.status, "PUBLISHED");
    });

    it("blocks an author from publishing their own note with HTTP 403", async () => {
      const adminAuthorId = "admin-author-uuid";
      const adminReviewerId = "admin-reviewer-uuid";
      const noteId = "note-uuid-1";

      const auditLogs: any[] = [
        {
          target_type: "Note",
          target_id: noteId,
          action: "NOTE_CREATED",
          actor_id: adminAuthorId,
          created_at: new Date(Date.now() - 10000),
        },
      ];

      const mockPrisma: any = {
        topic: {
          findUnique: async () => ({
            id: noteId,
            module_id: "mod-1",
            module: { id: "mod-1", status: "PUBLISHED", sort_order: 1 },
            updated_at: new Date(),
            contents: [
              {
                id: "c-1",
                kind: "NOTE",
                version: 0,
                status: "DRAFT",
                updated_at: new Date(),
              },
              {
                id: "c-2",
                kind: "AMHARIC_NOTE",
                version: 0,
                status: "DRAFT",
                updated_at: new Date(),
              },
            ],
          }),
          update: async () => ({ id: noteId, updated_at: new Date() }),
        },
        content: {
          create: async ({ data }: any) => ({
            id: "new-c",
            updated_at: new Date(),
            ...data,
          }),
          update: async ({ data }: any) => ({
            id: "c-1",
            updated_at: new Date(),
            ...data,
          }),
        },
        auditLog: {
          findFirst: async ({ where }: any) => {
            return auditLogs.find(
              (l) =>
                l.target_type === where.target_type &&
                l.target_id === where.target_id &&
                l.action === where.action &&
                (!where.actor_id || l.actor_id === where.actor_id),
            );
          },
        },
      };

      const mockAuditService: any = {
        log: async (event: any) => {
          auditLogs.push({
            target_type: event.targetType,
            target_id: event.targetId,
            action: event.action,
            actor_id: event.actorId,
          });
        },
      };

      const contentService = new ContentService(mockPrisma, mockAuditService, null as any);

      // 1. Author attempts to publish note -> MUST THROW 403
      await assert.rejects(
        async () => {
          await contentService.updateAdminNote(
            noteId,
            {
              courseId: "course-1",
              moduleId: "mod-1",
              title: { en: "Limits", am: "ወሰኖች" },
              body: { en: "Detailed calculus limits", am: "የካልኩለስ ወሰኖች ማብራሪያ" },
              isFree: false,
              status: "PUBLISHED" as any,
            },
            adminAuthorId,
          );
        },
        (err: any) => {
          assert(err instanceof ForbiddenException);
          assert.match(err.message, /Maker–checker policy violation/);
          return true;
        },
      );

      // 2. Distinct reviewer publishes note -> SUCCEEDS
      const result = await contentService.updateAdminNote(
        noteId,
        {
          courseId: "course-1",
          moduleId: "mod-1",
          title: { en: "Limits", am: "ወሰኖች" },
          body: { en: "Detailed calculus limits", am: "የካልኩለስ ወሰኖች ማብራሪያ" },
          isFree: false,
          status: "PUBLISHED" as any,
        },
        adminReviewerId,
      );

      assert.equal(result.status, "PUBLISHED");
      assert.equal(result.version, 1);
    });
  });

  describe("Refund Workflow & Entitlement Revocation (SRS 5.5, FR-G64)", () => {
    it("handles full lifecycle: request -> reject and request -> approve with entitlement revocation", async () => {
      const orderId = "order-ref-1";
      const studentId = "student-1";
      const adminOpsId = "ops-admin-1";
      const adminSuperId = "super-admin-1";

      const entitlements: any[] = [
        {
          id: "ent-1",
          student_id: studentId,
          course_id: "course-1",
          order_id: orderId,
          status: EntitlementStatus.ACTIVE,
          revoked_by: null,
          revoke_reason: null,
        },
        {
          id: "ent-2",
          student_id: studentId,
          course_id: "course-2",
          order_id: orderId,
          status: EntitlementStatus.ACTIVE,
          revoked_by: null,
          revoke_reason: null,
        },
      ];

      const order = {
        id: orderId,
        student_id: studentId,
        status: OrderStatus.APPROVED,
        entitlements,
        student: { id: studentId, first_name: "Abebe", last_name: "Kebede" },
      };

      const paymentProof = {
        id: "proof-1",
        order_id: orderId,
        method: "CBE_MOBILE",
        transaction_reference: "FT24REFUND123",
        status: ProofStatus.APPROVED,
        order,
      };

      const auditLogs: any[] = [];

      const mockPrisma: any = {
        paymentProof: {
          findFirst: async () => paymentProof,
        },
        entitlement: {
          updateMany: async ({ where, data }: any) => {
            for (const ent of entitlements) {
              if (ent.order_id === where.order_id) {
                ent.status = data.status;
                ent.revoked_by = data.revoked_by;
                ent.revoke_reason = data.revoke_reason;
              }
            }
          },
        },
        order: {
          update: async ({ data }: any) => {
            order.status = data.status;
          },
        },
        $transaction: async (fn: any) => fn(mockPrisma),
      };

      const mockAuditService: any = {
        log: async (event: any) => {
          auditLogs.push(event);
        },
      };

      const mockPushService: any = {
        sendToStudent: async () => {},
      };

      const service = new PaymentProofsService(mockPrisma, mockAuditService, mockPushService);

      // 1. Request refund
      const reqRes = await service.requestRefund(adminOpsId, orderId, {
        reason: "Duplicate charge requested by student",
      });
      assert.equal(reqRes.success, true);
      assert.equal(reqRes.status, "REQUESTED");

      const reqAudit = auditLogs.find((l) => l.action === "REFUND_REQUESTED");
      assert(reqAudit);
      assert.equal(reqAudit.targetId, orderId);
      assert.equal(reqAudit.actorId, adminOpsId);

      // 2. Reject refund
      const rejectRes = await service.decideRefund(adminSuperId, orderId, {
        action: "REJECT",
        reason: "Outside 48-hour return window",
      });
      assert.equal(rejectRes.status, "REJECTED");
      const rejectAudit = auditLogs.find((l) => l.action === "REFUND_REJECTED");
      assert(rejectAudit);
      // Entitlements must remain ACTIVE
      assert.equal(entitlements[0].status, EntitlementStatus.ACTIVE);

      // 3. Approve refund
      const approveRes = await service.decideRefund(adminSuperId, orderId, {
        action: "APPROVE",
        reason: "Exception granted by finance",
        payoutReference: "BANK-CBE-REF-0012",
      });
      assert.equal(approveRes.status, "ENTITLEMENT_REVOKED");
      assert.equal(approveRes.revokedEntitlementsCount, 2);

      // Entitlements MUST be REVOKED per FR-G64
      assert.equal(entitlements[0].status, EntitlementStatus.REVOKED);
      assert.equal(entitlements[0].revoked_by, adminSuperId);
      assert.equal(entitlements[0].revoke_reason, "Exception granted by finance");
      assert.equal(entitlements[1].status, EntitlementStatus.REVOKED);

      // Order status updated
      assert.equal(order.status, OrderStatus.CANCELLED);

      // Audit logs for REFUND_APPROVED and ENTITLEMENT_REVOKED exist
      const approveAudit = auditLogs.find((l) => l.action === "REFUND_APPROVED");
      assert(approveAudit);
      assert.equal(approveAudit.metadata.payoutReference, "BANK-CBE-REF-0012");

      const entAudits = auditLogs.filter((l) => l.action === "ENTITLEMENT_REVOKED");
      assert.equal(entAudits.length, 2);
    });
  });

  describe("Permission Guard on Refund Endpoints", () => {
    const reflector = new Reflector();
    const guard = new PermissionsGuard(reflector);

    function createMockCtx(user: any, requiredPermissions?: string[]): any {
      const handler = () => {};
      const targetClass = class AdminPaymentsController {};
      if (requiredPermissions) {
        Reflect.defineMetadata(PERMISSIONS_KEY, requiredPermissions, handler);
      }
      return {
        getHandler: () => handler,
        getClass: () => targetClass,
        switchToHttp: () => ({
          getRequest: () => ({
            url: "/api/v1/commerce/payments/order-1/refund-decide",
            user,
          }),
        }),
      };
    }

    it("allows Super Admin to approve refunds", () => {
      const ctx = createMockCtx(
        { role: "ADMIN", adminRole: "SUPER_ADMIN" },
        ["refunds.approve"],
      );
      assert.equal(guard.canActivate(ctx), true);
    });

    it("denies Academic Admin without refunds.approve", () => {
      const ctx = createMockCtx(
        { role: "ADMIN", adminRole: "ACADEMIC_ADMIN" },
        ["refunds.approve"],
      );
      assert.throws(() => guard.canActivate(ctx), ForbiddenException);
    });
  });
});
