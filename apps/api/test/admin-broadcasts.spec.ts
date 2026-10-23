// apps/api/test/admin-broadcasts.spec.ts

async function runAdminBroadcastsE2ETest() {
  console.log("=== Testing Admin Broadcasts & Student Notifications E2E ===\n");

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
    // 1. Authenticate Admin & Student
    console.log("--- 1. Authenticate Admin & Student ---");
    const adminLogin = await fetch(`${API_URL}/auth/admin/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        identifier: "admin@mastara.edu.et",
        password: "password123",
      }),
    });
    const adminAuth = (await adminLogin.json()) as any;
    assert(!!adminAuth.token, "Admin authenticated successfully");
    const adminToken = adminAuth.token;

    const studentLogin = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        identifier: "student@mastara.edu.et",
        password: "password123",
      }),
    });
    const studentAuth = (await studentLogin.json()) as any;
    assert(!!studentAuth.token, "Student authenticated successfully");
    const studentToken = studentAuth.token;

    // 2. Fetch past broadcasts
    console.log("\n--- 2. Fetch Past Broadcasts ---");
    const listRes = await fetch(`${API_URL}/notifications/admin/broadcasts`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(listRes.status === 200, "GET /notifications/admin/broadcasts returns 200");
    const broadcasts = (await listRes.json()) as any[];
    assert(Array.isArray(broadcasts) && broadcasts.length > 0, "Broadcasts list contains items");
    assert(!!broadcasts[0].title && !!broadcasts[0].recipientCount, "Broadcast has title and recipient count");

    // 3. Send a new broadcast to ALL students
    console.log("\n--- 3. Send Broadcast to ALL Students ---");
    const testTitle = `Important Exam Advisory - ${Date.now()}`;
    const testBody = "Please check your assigned room numbers before 8:30 AM tomorrow.";
    const sendRes = await fetch(`${API_URL}/notifications/admin/broadcast`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        title: testTitle,
        body: testBody,
        audience: "ALL",
        priority: "URGENT",
        actionUrl: "/exams",
      }),
    });
    assert(sendRes.status === 201, "POST /notifications/admin/broadcast returns 201 Created");
    const sentBroadcast = (await sendRes.json()) as any;
    assert(sentBroadcast.title === testTitle, "Broadcast title matches");
    assert(sentBroadcast.audience === "ALL", "Broadcast audience is ALL");
    assert(sentBroadcast.recipientCount > 0, `Delivered to ${sentBroadcast.recipientCount} students`);

    // 4. Verify student received SYSTEM_ANNOUNCEMENT notification
    console.log("\n--- 4. Verify Student In-App Notification ---");
    const notifRes = await fetch(`${API_URL}/notifications`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert(notifRes.status === 200, "GET /notifications returns 200");
    const studentNotifs = (await notifRes.json()) as any[];
    const matchingNotif = studentNotifs.find((n) => n.titleEn === testTitle);
    assert(!!matchingNotif, "Student received SYSTEM_ANNOUNCEMENT notification row");
    assert(matchingNotif.messageEn === testBody, "Notification message matches broadcast body");
    assert(matchingNotif.type === "SYSTEM_ANNOUNCEMENT", "Notification type is SYSTEM_ANNOUNCEMENT");

    // 5. Fetch Admin System Notifications
    console.log("\n--- 5. Fetch Admin Operational Alerts ---");
    const adminNotifRes = await fetch(`${API_URL}/notifications/admin/notifications`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(adminNotifRes.status === 200, "GET /notifications/admin/notifications returns 200");
    const adminNotifs = (await adminNotifRes.json()) as any[];
    assert(Array.isArray(adminNotifs) && adminNotifs.length > 0, "Admin notifications list populated");
    const firstAlert = adminNotifs[0];
    assert(!!firstAlert.id && !!firstAlert.type && !!firstAlert.title, "Admin notification has required fields");

    // 6. Mark admin notification as read
    console.log("\n--- 6. Mark Admin Notification Read ---");
    const markReadRes = await fetch(
      `${API_URL}/notifications/admin/notifications/${encodeURIComponent(firstAlert.id)}/read`,
      {
        method: "PATCH",
        headers: { Authorization: `Bearer ${adminToken}` },
      },
    );
    assert(markReadRes.status === 200, "PATCH /notifications/admin/notifications/:id/read returns 200");
    const afterMarkList = (await markReadRes.json()) as any[];
    const updatedAlert = afterMarkList.find((a) => a.id === firstAlert.id);
    assert(updatedAlert?.read === true, "Alert marked as read");

    // 7. Dismiss/remove admin notification
    console.log("\n--- 7. Dismiss Admin Notification ---");
    const removeRes = await fetch(
      `${API_URL}/notifications/admin/notifications/${encodeURIComponent(firstAlert.id)}`,
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${adminToken}` },
      },
    );
    assert(removeRes.status === 200, "DELETE /notifications/admin/notifications/:id returns 200");
    const afterRemoveList = (await removeRes.json()) as any[];
    assert(!afterRemoveList.some((a) => a.id === firstAlert.id), "Alert successfully removed from list");

    console.log(`\n================================`);
    console.log(`Total: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);
    console.log(`================================`);

    if (failed > 0) process.exit(1);
  } catch (err: any) {
    console.error("Test execution failed:", err);
    process.exit(1);
  }
}

runAdminBroadcastsE2ETest();
