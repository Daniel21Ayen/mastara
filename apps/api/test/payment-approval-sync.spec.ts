async function runPaymentApprovalE2ETest() {
  console.log("=== Testing Payment Approval Notifications & Entitlement Provisioning ===\n");

  const API_URL = "http://localhost:3000/api/v1";

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
    // 1. Authenticate student
    console.log("--- 1. Authenticate Student & Admin ---");
    const studentLogin = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        identifier: "student@mastara.edu.et",
        password: "password123",
      }),
    });
    const studentAuth = (await studentLogin.json()) as any;
    assert(!!studentAuth.token, "Student successfully logged in");
    const studentToken = studentAuth.token;
    const studentId = studentAuth.user.id;

    // Authenticate admin
    const adminLogin = await fetch(`${API_URL}/auth/admin/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        identifier: "admin@mastara.edu.et",
        password: "password123",
      }),
    });
    const adminAuth = (await adminLogin.json()) as any;
    assert(!!adminAuth.token, "Admin successfully logged in");
    const adminToken = adminAuth.token;

    // 2. Pick a course to purchase
    console.log("\n--- 2. Create Order for a Course ---");
    const coursesRes = await fetch(`${API_URL}/catalog/admin/courses`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const coursesData = (await coursesRes.json()) as any;
    const course = (coursesData.items || []).find((c: any) => !c.promotional) || coursesData.items?.[0];
    if (!course) throw new Error("No course found from catalog endpoint");

    const orderRef = `FT24${Date.now().toString().slice(-8)}`;

    const createOrderRes = await fetch(`${API_URL}/commerce/orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${studentToken}`,
      },
      body: JSON.stringify({
        type: "SINGLE",
        stream: course.stream || "NATURAL",
        courseIds: [course.id],
        method: "CBE_MOBILE",
        reference: orderRef,
      }),
    });
    const orderData = (await createOrderRes.json()) as any;
    assert(createOrderRes.status === 201, "Order created successfully (201 Created)");
    assert(
      orderData.status === "PENDING_PAYMENT" || orderData.status === "DRAFT",
      "Initial order status is pending payment (PENDING_PAYMENT)",
    );
    const orderId = orderData.id;

    // 3. Submit payment proof
    console.log("\n--- 3. Upload & Submit Payment Proof ---");
    const submitProofRes = await fetch(`${API_URL}/commerce/orders/${orderId}/proof`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${studentToken}`,
      },
      body: JSON.stringify({
        method: "CBE_MOBILE",
        transactionReference: orderRef,
        imageKey: `receipts/${orderId}-receipt.jpg`,
        imageMime: "image/jpeg",
        imageSizeBytes: 54321,
      }),
    });
    const proofData = (await submitProofRes.json()) as any;
    assert(submitProofRes.status === 201, "Payment proof submitted (201 Created)");
    assert(proofData.status === "PENDING", "Payment proof is PENDING review");
    const proofId = proofData.id;

    // Verify order is now PAYMENT_SUBMITTED
    const pendingOrdersRes = await fetch(`${API_URL}/commerce/orders`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    const pendingOrders = (await pendingOrdersRes.json()) as any;
    const currentOrder = pendingOrders.find((o: any) => o.id === orderId);
    assert(
      currentOrder?.status === "PAYMENT_SUBMITTED" || currentOrder?.status === "PENDING",
      "Order appears in student's orders list with pending status",
    );

    // 4. Admin reviews & approves payment proof
    console.log("\n--- 4. Admin Approves Payment Proof ---");
    const approveRes = await fetch(`${API_URL}/commerce/payments/${proofId}/decide`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        action: "APPROVE",
      }),
    });
    assert(approveRes.status === 200, "Admin approved payment proof (200 OK)");

    // 5. Verify order status is APPROVED
    console.log("\n--- 5. Verify Real-Time Order Status Refresh ---");
    const approvedOrdersRes = await fetch(`${API_URL}/commerce/orders`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    const approvedOrders = (await approvedOrdersRes.json()) as any;
    const updatedOrder = approvedOrders.find((o: any) => o.id === orderId);
    assert(updatedOrder?.status === "APPROVED", "Order status transitioned to APPROVED");

    // 6. Verify course entitlements unlocked in MyCourses
    console.log("\n--- 6. Verify Course Entitlements Unlocked ---");
    const myCoursesRes = await fetch(`${API_URL}/learning/my-courses`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    const myCourses = (await myCoursesRes.json()) as any;
    const unlockedCourse = myCourses.find((mc: any) => mc.course.id === course.id);
    assert(unlockedCourse !== undefined, "Course is now present in student's enrolled courses");
    assert(unlockedCourse?.access === "PAID", "Course access state is unlocked to PAID");
    assert(unlockedCourse?.daysLeft > 0, "Days left is active and positive");

    // 7. Verify In-App Notification created for payment approval
    console.log("\n--- 7. Verify Payment Approval Notification ---");
    const notificationsRes = await fetch(`${API_URL}/notifications`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    const notifications = (await notificationsRes.json()) as any;
    const approvalNotif = notifications.find(
      (n: any) => n.type === "PAYMENT_APPROVED" && n.data?.orderId === orderId,
    );
    assert(approvalNotif !== undefined, "PAYMENT_APPROVED notification created for student");
    assert(
      typeof approvalNotif?.data?.days === "number" && approvalNotif?.data?.days > 0,
      `Notification data includes access duration days (${approvalNotif?.data?.days} days)`,
    );
    assert(approvalNotif?.isRead === false, "Notification is unread");

    // 8. Test marking notification as read
    const markReadRes = await fetch(`${API_URL}/notifications/${approvalNotif.id}/read`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert(markReadRes.status === 200, "Notification successfully marked as read");

    console.log("\n========================================================");
    console.log(`Payment Approval Sync Test Summary: ${passed} passed, ${failed} failed`);
    console.log("========================================================\n");

    if (failed > 0) process.exit(1);
  } catch (err) {
    console.error("Test encountered unexpected error:", err);
    process.exit(1);
  }
}

runPaymentApprovalE2ETest();
