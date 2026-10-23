import "reflect-metadata";
import { Test, TestingModule } from "@nestjs/testing";
import { ConfigModule } from "@nestjs/config";
import { DatabaseModule } from "../src/infrastructure/database/database.module";
import { PrismaService } from "../src/infrastructure/database/prisma.service";
import { AuditModule } from "../src/modules/platform/audit/audit.module";
import { CommerceModule } from "../src/modules/commerce/commerce.module";
import { SyncModule } from "../src/modules/sync/sync.module";
import { EngagementModule } from "../src/modules/engagement/engagement.module";
import { OrdersService } from "../src/modules/commerce/orders/services/orders.service";
import { PricingService } from "../src/modules/commerce/pricing/services/pricing.service";
import { PaymentProofsService } from "../src/modules/commerce/payment-proofs/services/payment-proofs.service";
import { EntitlementsService } from "../src/modules/commerce/entitlements/services/entitlements.service";
import { OutboxService } from "../src/modules/sync/outbox/services/outbox.service";
import { NotificationsService } from "../src/modules/engagement/notifications/services/notifications.service";
import { SupportTicketsService } from "../src/modules/engagement/support-tickets/services/support-tickets.service";
import {
  ConflictException,
  BadRequestException,
  NotFoundException,
} from "@nestjs/common";
import {
  EntitlementStatus,
  NotificationType,
  OrderStatus,
  PaymentMethod,
  ProductType,
  ProofStatus,
  PublicationStatus,
  Role,
  Stream,
  StudentStatus,
  TicketStatus,
} from "@mastara/database";

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, details?: any) {
  if (condition) {
    console.log(`  ✓ ${testName}`);
    passed++;
  } else {
    console.error(`  ✗ ${testName}`, details ?? "");
    failed++;
  }
}

async function runB6Tests() {
  console.log(
    "=== Testing Phase B6: Commerce Orders, Sync Outbox, Notifications & Support (FR-103 to FR-119, FR-060 to FR-066) ===\n",
  );

  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [
      ConfigModule.forRoot({
        isGlobal: true,
        envFilePath: [".env", "../../.env"],
      }),
      DatabaseModule,
      AuditModule,
      CommerceModule,
      SyncModule,
      EngagementModule,
    ],
  }).compile();

  const prisma = moduleFixture.get<PrismaService>(PrismaService);
  const pricingService = moduleFixture.get<PricingService>(PricingService);
  const ordersService = new OrdersService(prisma, pricingService);
  const proofsService = moduleFixture.get<PaymentProofsService>(PaymentProofsService);
  const entitlementsService = moduleFixture.get<EntitlementsService>(EntitlementsService);
  const outboxService = moduleFixture.get<OutboxService>(OutboxService);
  const notificationsService = moduleFixture.get<NotificationsService>(NotificationsService);
  const ticketsService = moduleFixture.get<SupportTicketsService>(SupportTicketsService);

  const ts = Date.now();

  // --------------------------------------------------------------------------
  // Setup fixtures
  // --------------------------------------------------------------------------
  const university = await prisma.university.create({
    data: {
      name_en: "Mekelle University",
      name_am: "መቀሌ ዩኒቨርሲቲ",
      code: `MKU-${ts}`,
      status: PublicationStatus.PUBLISHED,
    },
  });

  const program = await prisma.program.create({
    data: {
      university_id: university.id,
      name_en: "Engineering",
      name_am: "ኢንጂነሪንግ",
      code: `ENG-${ts}`,
      status: PublicationStatus.PUBLISHED,
    },
  });

  const semester = await prisma.semester.create({
    data: {
      program_id: program.id,
      name_en: "Year 1 Semester 1",
      name_am: "ዓመት 1 ሴሚስተር 1",
      code: `Y1S1-${ts}`,
      status: PublicationStatus.PUBLISHED,
    },
  });

  const courseA = await prisma.course.create({
    data: {
      semester_id: semester.id,
      code: `MATH101-${ts}`,
      title_en: "Calculus I",
      title_am: "ካልኩለስ 1",
      stream: Stream.NATURAL,
      status: PublicationStatus.PUBLISHED,
      sort_order: 1,
    },
  });

  const courseB = await prisma.course.create({
    data: {
      semester_id: semester.id,
      code: `PHYS101-${ts}`,
      title_en: "General Physics",
      title_am: "አጠቃላይ ፊዚክስ",
      stream: Stream.NATURAL,
      status: PublicationStatus.PUBLISHED,
      sort_order: 2,
    },
  });

  const student = await prisma.student.create({
    data: {
      first_name: "Dawit",
      last_name: "Tesfaye",
      phone: `+251911${String(ts).slice(-6)}`,
      password_hash: "hashed_pw_b6test",
      role: Role.STUDENT,
      status: StudentStatus.ACTIVE,
    },
  });

  // Track IDs for cleanup
  let orderId: string | null = null;
  let proofId: string | null = null;

  try {
    // --------------------------------------------------------------------------
    // 1. Orders: Create
    // --------------------------------------------------------------------------
    console.log("1. Order Creation Tests:");

    const order = await ordersService.createOrder(student.id, {
      type: ProductType.SINGLE,
      stream: Stream.NATURAL,
      courseIds: [courseA.id],
      method: PaymentMethod.CBE_MOBILE,
      reference: `FT${ts}A`,
    });
    orderId = order.id;

    assert(
      order.status === OrderStatus.PENDING_PAYMENT &&
        order.items.length === 1 &&
        order.items[0]!.courseId === courseA.id,
      "Creates SINGLE order in PENDING_PAYMENT status with correct course item",
    );

    // Duplicate reference rejected
    let dupRejected = false;
    try {
      await ordersService.createOrder(student.id, {
        type: ProductType.SINGLE,
        stream: Stream.NATURAL,
        courseIds: [courseB.id],
        method: PaymentMethod.CBE_MOBILE,
        reference: `FT${ts}A`, // same ref
      });
    } catch (e) {
      if (e instanceof ConflictException) dupRejected = true;
    }
    assert(dupRejected, "Rejects order with duplicate payment reference (REFERENCE_ALREADY_USED)");

    // Invalid reference format rejected
    let invalidRefRejected = false;
    try {
      await ordersService.createOrder(student.id, {
        type: ProductType.SINGLE,
        stream: Stream.NATURAL,
        courseIds: [courseB.id],
        method: PaymentMethod.CBE_MOBILE,
        reference: "BADREF", // CBE_MOBILE must start with FT
      });
    } catch (e) {
      if (e instanceof BadRequestException) invalidRefRejected = true;
    }
    assert(invalidRefRejected, "Rejects CBE_MOBILE order with reference not starting with FT");

    // --------------------------------------------------------------------------
    // 2. Orders: List & Fetch
    // --------------------------------------------------------------------------
    console.log("\n2. Order Listing & Retrieval Tests:");

    const orders = await ordersService.getStudentOrders(student.id, {});
    assert(
      orders.length === 1 && orders[0]!.id === orderId,
      "Lists student orders returning the created order",
    );

    const fetched = await ordersService.getOrderById(student.id, orderId!);
    assert(
      fetched.id === orderId && fetched.quotedAmount === 60,
      "Fetches order by ID with correct quoted amount (60 ETB for SINGLE)",
    );

    // --------------------------------------------------------------------------
    // 3. Payment Proofs: Submit
    // --------------------------------------------------------------------------
    console.log("\n3. Payment Proof Submission Tests:");

    const proof = await proofsService.submitProof(student.id, orderId!, {
      method: PaymentMethod.CBE_MOBILE,
      transactionReference: `FT${ts}A`,
      imageKey: `receipts/${ts}/proof.jpg`,
      imageMime: "image/jpeg",
      imageSizeBytes: 102400,
    });
    proofId = proof.id;

    assert(
      proof.status === ProofStatus.PENDING &&
        proof.orderId === orderId,
      "Proof submitted successfully in PENDING status",
    );

    // Verify order advanced to PAYMENT_SUBMITTED
    const orderAfterProof = await ordersService.getOrderById(student.id, orderId!);
    assert(
      orderAfterProof.status === OrderStatus.PAYMENT_SUBMITTED,
      "Order status advances to PAYMENT_SUBMITTED after proof submission",
    );

    // Double-submission rejected
    let doubleProofRejected = false;
    try {
      await proofsService.submitProof(student.id, orderId!, {
        method: PaymentMethod.CBE_MOBILE,
        transactionReference: `FT${ts}B`,
        imageKey: `receipts/${ts}/proof2.jpg`,
        imageMime: "image/jpeg",
        imageSizeBytes: 50000,
      });
    } catch (e) {
      if (e instanceof ConflictException) doubleProofRejected = true;
    }
    assert(doubleProofRejected, "Rejects double proof submission for the same order");

    // Fetch proof
    const fetchedProof = await proofsService.getProofByOrderId(student.id, orderId!);
    assert(
      fetchedProof.id === proofId && fetchedProof.imageKey === `receipts/${ts}/proof.jpg`,
      "Retrieves proof by order ID with correct image key",
    );

    // --------------------------------------------------------------------------
    // 4. Payment Proof: Admin Approve → Entitlement provisioning
    // --------------------------------------------------------------------------
    console.log("\n4. Proof Approval & Entitlement Provisioning Tests:");

    const adminId = student.id; // Using student ID as mock admin for test isolation
    await proofsService.approveProof(adminId, proofId!, 150);

    const entitlements = await entitlementsService.getStudentEntitlements(student.id);
    assert(
      entitlements.length === 1 &&
        entitlements[0]!.courseId === courseA.id &&
        entitlements[0]!.status === EntitlementStatus.ACTIVE &&
        entitlements[0]!.daysLeft > 149,
      "Approving proof provisions an ACTIVE entitlement for the correct course with 150-day duration",
    );

    // Verify PAYMENT_APPROVED notification was fired
    const notifications = await notificationsService.getStudentNotifications(
      student.id,
      {},
    );
    const approvedNotif = notifications.find(
      (n) => n.type === NotificationType.PAYMENT_APPROVED,
    );
    assert(
      Boolean(approvedNotif) && approvedNotif!.isRead === false,
      "PAYMENT_APPROVED notification created and starts unread after proof approval",
    );

    // --------------------------------------------------------------------------
    // 5. Notifications: Read management
    // --------------------------------------------------------------------------
    console.log("\n5. Notification Read Management Tests:");

    const unreadBefore = await notificationsService.getStudentNotifications(
      student.id,
      { unreadOnly: true },
    );
    assert(unreadBefore.length >= 1, "Unread-only filter returns unread notifications");

    const marked = await notificationsService.markAsRead(
      student.id,
      approvedNotif!.id,
    );
    assert(marked.isRead === true, "markAsRead returns the notification with isRead=true");

    const markAllResult = await notificationsService.markAllAsRead(student.id);
    assert(
      typeof markAllResult.count === "number",
      "markAllAsRead returns a count of marked notifications",
    );

    // --------------------------------------------------------------------------
    // 6. Sync Outbox: Idempotent batch application
    // --------------------------------------------------------------------------
    console.log("\n6. Sync Outbox Idempotency Tests:");

    const opId = `018f2a5b-3e8c-7000-${String(ts).slice(0, 4)}-${String(ts).slice(4, 16)}`;
    const results = await outboxService.applyBatch(
      student.id,
      "device-hash-abc",
      {
        ops: [
          {
            id: opId,
            type: "ATTEMPT_FINISHED",
            payload: { attemptId: "mock-attempt-id", score: 78 },
            createdAt: new Date().toISOString(),
            seq: 1,
          },
        ],
      },
    );

    assert(
      results.length === 1 && results[0]!.id === opId && results[0]!.status === "accepted",
      "New outbox op accepted and stored",
    );

    // Re-upload same op → already_applied
    const resultsAgain = await outboxService.applyBatch(
      student.id,
      "device-hash-abc",
      {
        ops: [
          {
            id: opId,
            type: "ATTEMPT_FINISHED",
            payload: { attemptId: "mock-attempt-id", score: 78 },
            createdAt: new Date().toISOString(),
            seq: 1,
          },
        ],
      },
    );

    assert(
      resultsAgain[0]!.status === "already_applied",
      "Re-uploading same op returns already_applied (idempotent)",
    );

    // Multiple ops in one batch
    const batchResults = await outboxService.applyBatch(
      student.id,
      "device-hash-abc",
      {
        ops: [
          {
            id: `op-b6-2-${ts}`,
            type: "PROFILE_SAVED",
            payload: { name: "Dawit" },
            createdAt: new Date().toISOString(),
          },
          {
            id: `op-b6-3-${ts}`,
            type: "EXAM_SUBMITTED",
            payload: { examId: "exam-uuid", answers: [1, 2, 3] },
            createdAt: new Date().toISOString(),
          },
        ],
      },
    );

    assert(
      batchResults.length === 2 &&
        batchResults.every((r) => r.status === "accepted"),
      "Batch of 2 new ops both accepted in single request",
    );

    // --------------------------------------------------------------------------
    // 7. Support Tickets
    // --------------------------------------------------------------------------
    console.log("\n7. Support Tickets Tests:");

    const ticket = await ticketsService.createTicket(student.id, {
      subject: "Cannot access locked chapter",
      message:
        "I paid but chapter 3 is still showing as locked. Please help.",
    });

    assert(
      ticket.status === TicketStatus.OPEN &&
        ticket.messages.length === 1 &&
        ticket.messages[0]!.from === "STUDENT",
      "Creates ticket with OPEN status and initial student message",
    );

    const myTickets = await ticketsService.getStudentTickets(student.id, {});
    assert(
      myTickets.length >= 1 &&
        myTickets.some((t) => t.id === ticket.id) &&
        myTickets[0]!.messageCount >= 1,
      "Lists student tickets with message count",
    );

    const detailed = await ticketsService.getTicketById(student.id, ticket.id);
    assert(
      detailed.id === ticket.id && detailed.messages.length === 1,
      "Retrieves full ticket detail with message thread",
    );

    const newMsg = await ticketsService.addMessage(
      student.id,
      Role.STUDENT,
      ticket.id,
      { body: "I have tried logging out and back in — still locked." },
    );
    assert(
      newMsg.from === "STUDENT" && newMsg.body.includes("logging out"),
      "Adds follow-up student message to ticket",
    );

    // Access control: another student cannot view the ticket
    const otherStudent = await prisma.student.create({
      data: {
        first_name: "Hana",
        last_name: "Girma",
        phone: `+251922${String(ts).slice(-6)}`,
        password_hash: "hashed_pw_other",
        role: Role.STUDENT,
        status: StudentStatus.ACTIVE,
      },
    });

    let ticketAccessDenied = false;
    try {
      await ticketsService.getTicketById(otherStudent.id, ticket.id);
    } catch (e) {
      if (e instanceof NotFoundException || (e as any).status === 403) {
        ticketAccessDenied = true;
      }
    }
    assert(
      ticketAccessDenied,
      "Another student cannot view a ticket they do not own",
    );

    // --------------------------------------------------------------------------
    // 8. Entitlements: getStudentEntitlements returns correct shape
    // --------------------------------------------------------------------------
    console.log("\n8. Entitlements Summary Tests:");

    const entDetails = await entitlementsService.getStudentEntitlements(student.id);
    const ent = entDetails[0]!;
    assert(
      ent.courseCode === courseA.code &&
        ent.courseTitle.en === "Calculus I" &&
        ent.daysLeft > 0 &&
        ent.daysLeft <= 151,
      "Entitlement summary includes course code, bilingual title, and days remaining",
    );

    // Clean up other student
    await prisma.student.delete({ where: { id: otherStudent.id } });
  } finally {
    // --------------------------------------------------------------------------
    // Cleanup all fixtures
    // --------------------------------------------------------------------------
    if (proofId) {
      await prisma.paymentProof.deleteMany({ where: { id: proofId } });
    }
    if (orderId) {
      await prisma.entitlement.deleteMany({ where: { order_id: orderId } });
      await prisma.orderItem.deleteMany({ where: { order_id: orderId } });
      await prisma.order.deleteMany({ where: { id: orderId } });
    }
    await prisma.outboxEvent.deleteMany({ where: { student_id: student.id } });
    await prisma.supportTicket.deleteMany({ where: { student_id: student.id } });
    await prisma.notification.deleteMany({ where: { student_id: student.id } });
    await prisma.student.deleteMany({ where: { id: student.id } });
    await prisma.course.deleteMany({ where: { id: { in: [courseA.id, courseB.id] } } });
    await prisma.semester.delete({ where: { id: semester.id } });
    await prisma.program.delete({ where: { id: program.id } });
    await prisma.university.delete({ where: { id: university.id } });
  }

  console.log(`\n========================================`);
  console.log(`Results: ${passed} passed, ${failed} failed.`);
  console.log(`========================================\n`);

  await moduleFixture.close();

  if (failed > 0) {
    process.exit(1);
  }
}

runB6Tests().catch((err) => {
  console.error("B6 integration test run failed:", err);
  process.exit(1);
});
