import "reflect-metadata";
import {
  OrderStatus,
  PaymentMethod,
  ProofStatus,
  ProductType,
  Stream,
  StreamScope,
  Role,
} from "@mastara/database";
import {
  adminPaymentSchema,
  paymentListResultSchema,
} from "@mastara/contracts";
import { PaymentProofsService } from "../src/modules/commerce/payment-proofs/services/payment-proofs.service";
import { AdminPaymentsController } from "../src/modules/commerce/payment-proofs/controllers/admin-payments.controller";

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

async function runAdminPaymentsTests() {
  console.log("=== Testing Admin Payments Service, Controller & Contract Alignment ===\n");

  const now = new Date();
  const earlierDate = new Date(now.getTime() - 3600000);

  // In-memory mock DB state
  const mockProofs = [
    {
      id: "proof-uuid-1",
      order_id: "order-uuid-1",
      method: PaymentMethod.CBE_MOBILE,
      transaction_reference: "FT24001",
      image_key: "receipts/slip1.jpg",
      image_size_bytes: 10240,
      image_mime: "image/jpeg",
      status: ProofStatus.PENDING,
      reviewed_by: null,
      reviewed_at: null,
      reject_reason: null,
      created_at: earlierDate,
      updated_at: earlierDate,
      order: {
        id: "order-uuid-1",
        student_id: "student-uuid-1",
        quoted_amount: 450,
        status: OrderStatus.PAYMENT_SUBMITTED,
        stream: Stream.NATURAL,
        created_at: earlierDate,
        student: {
          id: "student-uuid-1",
          first_name: "Abebe",
          last_name: "Kebede",
          university: { code: "AAU", name_en: "Addis Ababa University" },
        },
        product: {
          id: "prod-1",
          type: ProductType.BUNDLE,
          stream_scope: StreamScope.NATURAL,
          duration_days: 120,
        },
        items: [
          {
            course_id: "c-1",
            course: { id: "c-1", code: "MATH101", title_en: "Calculus I" },
          },
          {
            course_id: "c-2",
            course: { id: "c-2", code: "PHYS101", title_en: "General Physics" },
          },
        ],
      },
    },
    {
      id: "proof-uuid-2",
      order_id: "order-uuid-2",
      method: PaymentMethod.TELEBIRR,
      transaction_reference: "FT24001", // Duplicate of proof-1!
      image_key: "receipts/slip2.jpg",
      image_size_bytes: 8192,
      image_mime: "image/jpeg",
      status: ProofStatus.PENDING,
      reviewed_by: null,
      reviewed_at: null,
      reject_reason: null,
      created_at: now,
      updated_at: now,
      order: {
        id: "order-uuid-2",
        student_id: "student-uuid-2",
        quoted_amount: 250,
        status: OrderStatus.PAYMENT_SUBMITTED,
        stream: Stream.NATURAL,
        created_at: now,
        student: {
          id: "student-uuid-2",
          first_name: "Tigist",
          last_name: "Alemu",
          university: { code: "ASTU", name_en: "Adama Science and Technology" },
        },
        product: {
          id: "prod-2",
          type: ProductType.SINGLE,
          stream_scope: StreamScope.NATURAL,
          duration_days: 60,
        },
        items: [
          {
            course_id: "c-1",
            course: { id: "c-1", code: "MATH101", title_en: "Calculus I" },
          },
        ],
      },
    },
  ];

  const auditLogs: any[] = [];
  const createdEntitlements: any[] = [];
  const createdNotifications: any[] = [];

  const mockPrisma: any = {
    paymentProof: {
      count: async ({ where }: any) => {
        let count = 0;
        for (const p of mockProofs) {
          if (where?.status && p.status !== where.status) continue;
          if (where?.method && p.method !== where.method) continue;
          count++;
        }
        return count;
      },
      findMany: async ({ where, skip = 0, take = 10 }: any) => {
        let result = mockProofs.filter((p) => {
          if (where?.status && p.status !== where.status) return false;
          if (where?.method && p.method !== where.method) return false;
          if (where?.transaction_reference?.in) {
            return where.transaction_reference.in.includes(p.transaction_reference);
          }
          return true;
        });
        return result.slice(skip, skip + take);
      },
      findFirst: async ({ where }: any) => {
        if (where?.OR) {
          return (
            mockProofs.find((p) =>
              where.OR.some(
                (cond: any) => cond.id === p.id || cond.order_id === p.order_id,
              ),
            ) || null
          );
        }
        if (where?.transaction_reference && where?.id?.not) {
          return (
            mockProofs.find(
              (p) =>
                p.transaction_reference === where.transaction_reference &&
                p.id !== where.id.not &&
                p.created_at < where.created_at.lt,
            ) || null
          );
        }
        return null;
      },
      findUnique: async ({ where }: any) => {
        return mockProofs.find((p) => p.id === where.id || p.order_id === where.order_id) || null;
      },
      update: async ({ where, data }: any) => {
        const p = mockProofs.find((item) => item.id === where.id || item.order_id === where.order_id);
        if (p) {
          Object.assign(p, data);
        }
        return p;
      },
    },
    order: {
      update: async ({ where, data }: any) => {
        const p = mockProofs.find((item) => item.order_id === where.id);
        if (p) {
          Object.assign(p.order, data);
        }
        return p?.order;
      },
    },
    entitlement: {
      create: async ({ data }: any) => {
        createdEntitlements.push(data);
        return { id: "ent-uuid", ...data };
      },
    },
    notification: {
      create: async ({ data }: any) => {
        createdNotifications.push(data);
        return { id: "notif-uuid", ...data };
      },
    },
    auditLog: {
      create: async ({ data }: any) => {
        auditLogs.push(data);
        return { id: "audit-uuid", ...data };
      },
    },
    $transaction: async (cb: any) => cb(mockPrisma),
  };

  const mockAuditService: any = {
    log: async (entry: any) => {
      auditLogs.push(entry);
    },
  };

  const service = new PaymentProofsService(mockPrisma, mockAuditService);
  const controller = new AdminPaymentsController(service);

  // 1. Test getAdminPayments listing
  const listResult = await service.getAdminPayments({ status: "PENDING", page: 1 });
  assert(listResult.items.length === 2, "Lists 2 pending payments");
  assert(listResult.counts.pending === 2, "Pending count is 2");
  assert(listResult.counts.approved === 0, "Approved count is 0");
  assert(listResult.counts.rejected === 0, "Rejected count is 0");

  // Validate list result with contracts Zod schema
  const parsedList = paymentListResultSchema.safeParse(listResult);
  assert(parsedList.success, "PaymentListResult validates against @mastara/contracts schema");

  // Verify duplicate detection
  const proof2InList = listResult.items.find((i) => i.id === "proof-uuid-2");
  assert(
    proof2InList?.duplicateOf === "proof-uuid-1",
    "Detects duplicateOf pointing to earlier proof-uuid-1",
  );

  const proof1InList = listResult.items.find((i) => i.id === "proof-uuid-1");
  assert(proof1InList?.duplicateOf === null, "Earlier proof-uuid-1 has duplicateOf === null");

  // 2. Test getAdminPaymentById
  const paymentById = await service.getAdminPaymentById("proof-uuid-1");
  assert(paymentById.id === "proof-uuid-1", "Finds payment by proof.id");
  assert(paymentById.studentName === "Abebe Kebede", "Student name matches");
  assert(paymentById.universityShortName === "AAU", "University short name matches");
  assert(paymentById.amount === 450, "Amount matches quoted amount");
  assert(paymentById.courses.length === 2, "Contains 2 course items");

  const parsedDetail = adminPaymentSchema.safeParse(paymentById);
  assert(parsedDetail.success, "AdminPayment validates against @mastara/contracts schema");

  // Test finding by order_id
  const paymentByOrderId = await service.getAdminPaymentById("order-uuid-1");
  assert(paymentByOrderId.id === "proof-uuid-1", "Finds payment by order.id");

  // 3. Test decidePayment - APPROVE
  const approvedPayment = await service.decidePayment("admin-123", "proof-uuid-1", {
    action: "APPROVE",
  });
  assert(approvedPayment.status === "APPROVED", "Status updated to APPROVED");
  assert(approvedPayment.decidedAt !== null, "decidedAt timestamp populated");
  assert(createdEntitlements.length === 2, "Provisioned 2 course entitlements");
  assert(
    auditLogs.some(
      (l) => l.action === "PAYMENT_APPROVED" && l.targetId === "proof-uuid-1",
    ),
    "Logged PAYMENT_APPROVED audit entry",
  );
  assert(
    createdNotifications.some(
      (n) => n.student_id === "student-uuid-1" && n.type === "PAYMENT_APPROVED",
    ),
    "Sent PAYMENT_APPROVED notification to student",
  );

  // 4. Test decidePayment on already decided payment throws ConflictException
  let threwConflict = false;
  try {
    await service.decidePayment("admin-123", "proof-uuid-1", { action: "APPROVE" });
  } catch (err: any) {
    threwConflict = true;
  }
  assert(threwConflict, "Throws conflict when deciding already-decided payment");

  // 5. Test decidePayment - REJECT
  const rejectedPayment = await service.decidePayment("admin-123", "proof-uuid-2", {
    action: "REJECT",
    reason: "MISMATCH",
  });
  assert(rejectedPayment.status === "REJECTED", "Status updated to REJECTED");
  assert(rejectedPayment.rejectReason === "MISMATCH", "rejectReason stored as MISMATCH");
  assert(
    auditLogs.some(
      (l) =>
        l.action === "PAYMENT_REJECTED" &&
        l.targetId === "proof-uuid-2" &&
        l.metadata.rejectReason === "MISMATCH",
    ),
    "Logged PAYMENT_REJECTED audit entry with reason",
  );

  // 6. Test AdminPaymentsController endpoints
  const controllerList = await controller.listPayments({ status: "APPROVED", page: 1 });
  assert(controllerList.counts.approved === 1, "Controller listPayments returns approved count 1");

  const controllerDetail = await controller.getPayment("proof-uuid-1");
  assert(controllerDetail.id === "proof-uuid-1", "Controller getPayment returns payment");

  console.log(`\nResults: ${passed} passed, ${failed} failed`);
  if (failed > 0) {
    process.exit(1);
  }
}

runAdminPaymentsTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
