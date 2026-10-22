import * as fs from "fs";
import * as path from "path";

async function runLiveE2ETest() {
  console.log("=== Live End-to-End Test for File Uploads ===");

  const API_URL = "http://localhost:3000/api/v1";

  // 1. Obtain student token (Abebe Kebede seeded demo user)
  console.log("\n1. Authenticating student...");
  const studentLoginRes = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      identifier: "student@mastara.edu.et",
      password: "password123",
    }),
  });

  const studentLoginData = (await studentLoginRes.json()) as any;
  if (!studentLoginRes.ok || !studentLoginData.token) {
    console.error("Failed to authenticate student:", studentLoginData);
    process.exit(1);
  }
  const studentToken = studentLoginData.token;
  console.log("  ✓ Student authenticated successfully");

  // 2. Obtain admin token (Admin seeded demo user)
  console.log("\n2. Authenticating admin...");
  const adminLoginRes = await fetch(`${API_URL}/auth/admin/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      identifier: "admin@mastara.edu.et",
      password: "password123",
    }),
  });

  const adminLoginData = (await adminLoginRes.json()) as any;
  if (!adminLoginRes.ok || !adminLoginData.token) {
    console.error("Failed to authenticate admin:", adminLoginData);
    process.exit(1);
  }
  const adminToken = adminLoginData.token;
  console.log("  ✓ Admin authenticated successfully");

  // 3. Upload receipt screenshot as student
  console.log("\n3. Student uploading payment receipt screenshot (JPEG)...");
  const receiptBlob = new Blob([
    Buffer.from("ÿØÿà\x00\x10JFIF\x00\x01\x01\x01\x00H\x00H\x00\x00ÿÛ\x00C\x00SAMPLE_TELEBIRR_SCREENSHOT"),
  ], { type: "image/jpeg" });

  const receiptFormData = new FormData();
  receiptFormData.append("file", receiptBlob, "telebirr_slip_FT24098ABC.jpg");
  receiptFormData.append("orderId", "demo-order-7788");

  const receiptUploadRes = await fetch(`${API_URL}/storage/receipt`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${studentToken}`,
    },
    body: receiptFormData,
  });

  const receiptUploadData = (await receiptUploadRes.json()) as any;
  if (!receiptUploadRes.ok) {
    console.error("Receipt upload failed:", receiptUploadData);
    process.exit(1);
  }
  console.log("  ✓ Receipt upload succeeded!");
  console.log("    Key:", receiptUploadData.key);
  console.log("    URL:", receiptUploadData.url);
  console.log("    Size:", receiptUploadData.sizeBytes, "bytes");
  console.log("    SHA256:", receiptUploadData.checksumSha256);

  // 4. Upload scanned exam paper (PDF) as admin
  console.log("\n4. Admin uploading scanned exam paper (PDF)...");
  const scanBlob = new Blob([
    Buffer.from("%PDF-1.4\n%âãÏÓ\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n%%EOF"),
  ], { type: "application/pdf" });

  const scanFormData = new FormData();
  scanFormData.append("file", scanBlob, "freshman_physics_midterm_scanned.pdf");
  scanFormData.append("scanJobId", "scan-job-phy-101");

  const scanUploadRes = await fetch(`${API_URL}/storage/scan`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${adminToken}`,
    },
    body: scanFormData,
  });

  const scanUploadData = (await scanUploadRes.json()) as any;
  if (!scanUploadRes.ok) {
    console.error("Scan PDF upload failed:", scanUploadData);
    process.exit(1);
  }
  console.log("  ✓ Scanned PDF upload succeeded!");
  console.log("    Key:", scanUploadData.key);
  console.log("    URL:", scanUploadData.url);
  console.log("    Size:", scanUploadData.sizeBytes, "bytes");

  // 5. Download uploaded files via /storage/file
  console.log("\n5. Testing file download & streaming...");
  const downloadRes = await fetch(
    `${API_URL}/storage/file?key=${encodeURIComponent(receiptUploadData.key)}`,
    {
      headers: { Authorization: `Bearer ${studentToken}` },
    },
  );
  if (!downloadRes.ok) {
    console.error("Download failed:", downloadRes.status);
    process.exit(1);
  }
  const downloadedBytes = await downloadRes.arrayBuffer();
  console.log("  ✓ Streamed receipt size matches:", downloadedBytes.byteLength, "bytes");
  console.log("    Content-Type header:", downloadRes.headers.get("content-type"));

  // 6. Test Security: Reject unauthorized upload
  console.log("\n6. Testing Security: unauthenticated upload rejected...");
  const unauthRes = await fetch(`${API_URL}/storage/receipt`, {
    method: "POST",
    body: receiptFormData,
  });
  if (unauthRes.status === 401) {
    console.log("  ✓ Unauthenticated upload correctly returned 401 Unauthorized");
  } else {
    console.error("Expected 401, got:", unauthRes.status);
    process.exit(1);
  }

  // 7. Test Security: Reject dangerous extension
  console.log("\n7. Testing Security: dangerous executable rejected...");
  const maliciousBlob = new Blob([Buffer.from("#!/bin/bash\necho evil")], {
    type: "image/jpeg",
  });
  const maliciousFormData = new FormData();
  maliciousFormData.append("file", maliciousBlob, "exploit.sh");

  const maliciousRes = await fetch(`${API_URL}/storage/receipt`, {
    method: "POST",
    headers: { Authorization: `Bearer ${studentToken}` },
    body: maliciousFormData,
  });
  const maliciousData = (await maliciousRes.json()) as any;
  if (maliciousRes.status === 400 && maliciousData.errorCode === "DANGEROUS_FILE_EXTENSION") {
    console.log("  ✓ Dangerous .sh extension rejected with 400 DANGEROUS_FILE_EXTENSION");
  } else {
    console.error("Expected 400 DANGEROUS_FILE_EXTENSION, got:", maliciousRes.status, maliciousData);
    process.exit(1);
  }

  // 8. Test Security: Reject disallowed MIME type
  console.log("\n8. Testing Security: disallowed MIME type for receipt rejected...");
  const badMimeBlob = new Blob([Buffer.from("not an image")], {
    type: "application/zip",
  });
  const badMimeFormData = new FormData();
  badMimeFormData.append("file", badMimeBlob, "archive.zip");

  const badMimeRes = await fetch(`${API_URL}/storage/receipt`, {
    method: "POST",
    headers: { Authorization: `Bearer ${studentToken}` },
    body: badMimeFormData,
  });
  const badMimeData = (await badMimeRes.json()) as any;
  if (badMimeRes.status === 400 && badMimeData.errorCode === "INVALID_FILE_TYPE") {
    console.log("  ✓ Disallowed MIME type rejected with 400 INVALID_FILE_TYPE");
  } else {
    console.error("Expected 400 INVALID_FILE_TYPE, got:", badMimeRes.status, badMimeData);
    process.exit(1);
  }

  console.log("\n=== ALL LIVE E2E FILE UPLOAD TESTS PASSED SUCCESSFULLY! ===\n");
}

runLiveE2ETest().catch((err) => {
  console.error("Live test failed:", err);
  process.exit(1);
});
