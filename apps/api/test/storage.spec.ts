import { ConfigService } from "@nestjs/config";
import { LocalDriver } from "../src/infrastructure/storage/local.driver";
import { StorageService } from "../src/infrastructure/storage/storage.service";
import * as fs from "fs/promises";
import * as path from "path";

async function runTests() {
  console.log("=== Testing Storage Infrastructure ===");

  const testDir = path.join(process.cwd(), "apps/api/test/scratch-storage");
  try {
    await fs.rm(testDir, { recursive: true, force: true });
  } catch {}

  const mockConfig = {
    get: (key: string) => {
      if (key === "STORAGE_LOCAL_DIR") return testDir;
      if (key === "STORAGE_PUBLIC_BASE_URL") return "http://localhost:3000/uploads";
      return null;
    },
  } as unknown as ConfigService;

  const storageService = new StorageService(mockConfig);

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, message: string) {
    if (condition) {
      console.log(`  ✓ ${message}`);
      passed++;
    } else {
      console.error(`  ✗ ${message}`);
      failed++;
    }
  }

  try {
    // 1. Upload a receipt
    const receiptData = Buffer.from("fake-receipt-image-content");
    const receiptResult = await storageService.uploadReceipt(
      "ord-123",
      "my-receipt.png",
      receiptData,
      "image/png",
    );

    assert(receiptResult.key.startsWith("receipts/ord-123-"), "Receipt key generated properly");
    assert(receiptResult.sizeBytes === receiptData.length, "Size bytes matches buffer length");
    assert(!!receiptResult.checksumSha256, "SHA-256 checksum generated");
    assert(
      receiptResult.url.startsWith("http://localhost:3000/uploads/receipts/"),
      "Public URL correctly formed",
    );

    // 2. Check existence
    const exists = await storageService.exists(receiptResult.key);
    assert(exists === true, "File exists on storage");

    // 3. Download the file
    const downloaded = await storageService.download(receiptResult.key);
    assert(downloaded.toString("utf8") === "fake-receipt-image-content", "Downloaded content matches");

    // 4. Upload a course document
    const docData = Buffer.from("%PDF-1.4 sample lecture content");
    const docResult = await storageService.uploadDocument(
      "course-geography",
      "chapter-1.pdf",
      docData,
      "application/pdf",
    );
    assert(
      docResult.key.startsWith("courses/course-geography/documents/"),
      "Document key formatted correctly",
    );
    assert(docResult.mimeType === "application/pdf", "MIME type preserved");

    // 5. Delete asset
    await storageService.delete(receiptResult.key);
    const existsAfterDelete = await storageService.exists(receiptResult.key);
    assert(existsAfterDelete === false, "File deleted properly");

    // Clean up scratch dir
    await fs.rm(testDir, { recursive: true, force: true });

    console.log(`\nResults: ${passed} passed, ${failed} failed\n`);
    if (failed > 0) process.exit(1);
  } catch (err) {
    console.error("Test execution failed:", err);
    process.exit(1);
  }
}

runTests();
