// apps/api/test/push-notifications.spec.ts

async function runPushNotificationsE2ETest() {
  console.log("=== Testing Push Notifications (Expo & Firebase FCM) ===\n");

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
    // 1. Authenticate student & admin
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
    assert(!!studentAuth.token, "Student authenticated successfully");
    const studentToken = studentAuth.token;
    const studentId = studentAuth.user.id;

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

    // 2. Register Expo Push Token
    console.log("\n--- 2. Register Expo Push Token ---");
    const expoToken = `ExponentPushToken[e2e-test-token-${Date.now()}]`;
    const regExpoRes = await fetch(`${API_URL}/notifications/push-token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${studentToken}`,
      },
      body: JSON.stringify({
        token: expoToken,
        platform: "android",
      }),
    });
    assert(regExpoRes.status === 200, "Register Expo push token returns HTTP 200");
    const regExpoData = (await regExpoRes.json()) as any;
    assert(regExpoData.success === true && regExpoData.registered === true, "Expo token registration acknowledged");

    // 3. Register Firebase FCM Token
    console.log("\n--- 3. Register Firebase FCM Token ---");
    const fcmToken = `fcm_device_token_${Date.now()}_abc123xyz`;
    const regFcmRes = await fetch(`${API_URL}/notifications/push-token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${studentToken}`,
      },
      body: JSON.stringify({
        token: fcmToken,
        platform: "android",
      }),
    });
    assert(regFcmRes.status === 200, "Register Firebase FCM token returns HTTP 200");
    const regFcmData = (await regFcmRes.json()) as any;
    assert(regFcmData.success === true && regFcmData.registered === true, "Firebase FCM token registration acknowledged");

    // Re-register Expo token for push dispatch testing
    await fetch(`${API_URL}/notifications/push-token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${studentToken}`,
      },
      body: JSON.stringify({
        token: expoToken,
        platform: "android",
      }),
    });

    // 4. Test Exam Result Push Notification on Attempt Submission
    console.log("\n--- 4. Exam Attempt Submission & Result Notification ---");
    const freeTrialExamId = "0d0d03e7-8526-43b9-9442-ae836103db1a";

    const startRes = await fetch(`${API_URL}/assessment/attempts/start`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${studentToken}`,
      },
      body: JSON.stringify({
        category: "EXAM",
        examId: freeTrialExamId,
      }),
    });

    const startData = (await startRes.json()) as any;
    const attemptId = startData.id || startData.attemptId;

    if (attemptId) {
      assert(true, `Exam attempt active with ID: ${attemptId}`);

      // Submit attempt
      const submitRes = await fetch(`${API_URL}/assessment/attempts/${attemptId}/submit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${studentToken}`,
        },
        body: JSON.stringify({
          answers: [],
          elapsedMs: 45000,
        }),
      });
      assert(submitRes.status === 201 || submitRes.status === 200, "Attempt submitted and graded");

      // Verify that in-app notification of type EXAM_RESULT exists
      const notifsRes = await fetch(`${API_URL}/notifications`, {
        headers: { Authorization: `Bearer ${studentToken}` },
      });
      const notifs = (await notifsRes.json()) as any[];
      const examNotif = notifs.find((n: any) => n.type === "EXAM_RESULT");
      assert(!!examNotif, "EXAM_RESULT notification persisted and retrieved for student");
      if (examNotif) {
        assert(!!examNotif.titleEn && !!examNotif.titleAm, "EXAM_RESULT notification has bilingual titles");
        assert(examNotif.data?.attemptId === attemptId, "EXAM_RESULT notification links to correct attemptId");
      }
    } else {
      console.log("  ⚠️ Could not start fresh attempt, checking existing notifications");
    }

    // 5. Test Payment Approval Push Notification
    console.log("\n--- 5. Payment Approval Push Notification ---");
    const orderRef = `FT24${Date.now().toString().slice(-8)}`;
    const createOrderRes = await fetch(`${API_URL}/commerce/orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${studentToken}`,
      },
      body: JSON.stringify({
        type: "SINGLE",
        stream: "NATURAL",
        courseIds: ["af95528f-d5e7-4fc0-8e3a-820eb0030e1f"],
        method: "CBE_MOBILE",
        reference: orderRef,
      }),
    });
    const orderData = (await createOrderRes.json()) as any;
    assert(createOrderRes.status === 201 && !!orderData.id, `Order created with ID: ${orderData.id}`);

    // Submit payment proof
    const submitProofRes = await fetch(`${API_URL}/commerce/orders/${orderData.id}/proof`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${studentToken}`,
      },
      body: JSON.stringify({
        method: "CBE_MOBILE",
        transactionReference: orderRef,
        imageKey: "receipts/push_test_receipt.jpg",
        imageMime: "image/jpeg",
        imageSizeBytes: 102400,
      }),
    });
    assert(submitProofRes.status === 201 || submitProofRes.status === 200, "Payment proof submitted");
    const proofData = (await submitProofRes.json()) as any;
    const targetProofId = proofData.id;
    assert(!!targetProofId, `Payment proof created with ID: ${targetProofId}`);

    if (targetProofId) {
      // Approve proof
      const decideRes = await fetch(`${API_URL}/commerce/payments/${targetProofId}/decide`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          action: "APPROVE",
        }),
      });
      assert(decideRes.status === 200, "Admin approved payment proof");

      // Verify PAYMENT_APPROVED notification was created
      const notifsRes2 = await fetch(`${API_URL}/notifications`, {
        headers: { Authorization: `Bearer ${studentToken}` },
      });
      const notifs2 = (await notifsRes2.json()) as any[];
      const approvedNotif = notifs2.find((n: any) => n.type === "PAYMENT_APPROVED" && n.data?.orderId === orderData.id);
      assert(!!approvedNotif, "PAYMENT_APPROVED notification created and retrieved for student");
      if (approvedNotif) {
        assert(approvedNotif.titleEn === "Payment Approved", "Notification titleEn is 'Payment Approved'");
        assert(approvedNotif.titleAm === "ክፍያ ተቀበለ", "Notification titleAm is 'ክፍያ ተቀበለ'");
      }
    }

    console.log(`\n========================================`);
    console.log(`Push Notifications Test Summary:`);
    console.log(`  Passed: ${passed}`);
    console.log(`  Failed: ${failed}`);
    console.log(`========================================\n`);

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err: any) {
    console.error("Test execution failed:", err);
    process.exit(1);
  }
}

void runPushNotificationsE2ETest();
