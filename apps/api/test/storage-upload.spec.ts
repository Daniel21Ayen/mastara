import "reflect-metadata";
import { BadRequestException, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as fs from "fs/promises";
import * as path from "path";
import { LocalDriver } from "../src/infrastructure/storage/local.driver";
import { StorageService } from "../src/infrastructure/storage/storage.service";
import { StorageController } from "../src/infrastructure/storage/controllers/storage.controller";
import {
  MAX_RECEIPT_BYTES,
  MAX_DOCUMENT_BYTES,
  RECEIPT_ALLOWED_MIME_TYPES,
  DOCUMENT_ALLOWED_MIME_TYPES,
  DISALLOWED_EXTENSIONS,
  sanitizeFilename,
  validateUploadedFile,
} from "../src/infrastructure/storage/storage-validation";

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

async function runStorageUploadTests() {
  console.log("=== Testing NestJS Storage Controller & File Upload Validation ===\n");

  const testStorageDir = path.join(process.cwd(), "apps/api/test/scratch-storage-upload");
  try {
    await fs.rm(testStorageDir, { recursive: true, force: true });
  } catch {}

  const mockConfig = {
    get: (key: string) => {
      if (key === "STORAGE_LOCAL_DIR") return testStorageDir;
      if (key === "STORAGE_PUBLIC_BASE_URL") return "http://localhost:3000/uploads";
      return null;
    },
  } as unknown as ConfigService;

  const localDriver = new LocalDriver(mockConfig);
  const storageService = new StorageService(localDriver);
  const storageController = new StorageController(storageService);

  // Helper to construct simulated Express.Multer.File
  function createMockFile(options: {
    originalname: string;
    mimetype: string;
    buffer: Buffer;
  }): Express.Multer.File {
    return {
      fieldname: "file",
      originalname: options.originalname,
      encoding: "7bit",
      mimetype: options.mimetype,
      buffer: options.buffer,
      size: options.buffer.length,
      stream: null as any,
      destination: "",
      filename: options.originalname,
      path: "",
    };
  }

  try {
    // ----------------------------------------------------
    // 1. Sanitize Filename Tests
    // ----------------------------------------------------
    console.log("--- 1. Filename Sanitization ---");
    assert(
      sanitizeFilename("clean_receipt.jpg") === "clean_receipt.jpg",
      "Clean filename is preserved",
    );
    assert(
      sanitizeFilename("../../../etc/passwd.jpg") === "passwd.jpg",
      "Path traversal sequences (..) are stripped",
    );
    assert(
      sanitizeFilename('malicious<script>:|"bad?.png') === "malicious-script-bad.png",
      "Dangerous filesystem characters are sanitized and collapsed to hyphens",
    );
    assert(sanitizeFilename("") === "file", "Empty filename defaults to 'file'");

    // ----------------------------------------------------
    // 2. Receipt Screenshot Upload Tests (JPEG, PNG, WEBP)
    // ----------------------------------------------------
    console.log("\n--- 2. Receipt Screenshot Uploads ---");

    // Sample 1: JPEG bank slip screenshot
    const cbeReceiptBuffer = Buffer.from("ÿØÿà\x00\x10JFIF sample CBE mobile bank receipt JPEG bytes");
    const cbeFile = createMockFile({
      originalname: "cbe_receipt_FT24098ABC.jpg",
      mimetype: "image/jpeg",
      buffer: cbeReceiptBuffer,
    });

    const cbeResult = await storageController.uploadReceipt(
      cbeFile,
      { orderId: "order-cbe-98765" },
      { id: "student-123" },
    );

    assert(
      cbeResult.key.startsWith("receipts/order-cbe-98765-"),
      "Receipt key prefixed with orderId",
    );
    assert(cbeResult.mimeType === "image/jpeg", "Receipt MIME type is image/jpeg");
    assert(cbeResult.sizeBytes === cbeReceiptBuffer.length, "Receipt size bytes match input buffer");
    assert(!!cbeResult.checksumSha256, "Receipt SHA-256 checksum generated");
    assert(
      cbeResult.url.startsWith("http://localhost:3000/uploads/receipts/"),
      "Receipt public URL correctly resolved",
    );

    // Verify stored file is readable
    const cbeDownloaded = await storageService.download(cbeResult.key);
    assert(
      cbeDownloaded.equals(cbeReceiptBuffer),
      "Downloaded receipt matches uploaded binary content byte-for-byte",
    );

    // Sample 2: PNG Telebirr screenshot
    const telebirrBuffer = Buffer.from("\x89PNG\r\n\x1a\n sample Telebirr mobile payment PNG screenshot");
    const telebirrFile = createMockFile({
      originalname: "telebirr_payment_TB998877.png",
      mimetype: "image/png",
      buffer: telebirrBuffer,
    });

    const tbResult = await storageController.uploadReceipt(
      telebirrFile,
      {},
      { id: "student-456" },
    );
    assert(
      tbResult.key.startsWith("receipts/usr-student-456-"),
      "Receipt key falls back to student id when orderId is omitted",
    );
    assert(tbResult.mimeType === "image/png", "Telebirr PNG receipt uploaded successfully");

    // ----------------------------------------------------
    // 3. Scanned PDF & Test Papers Upload Tests
    // ----------------------------------------------------
    console.log("\n--- 3. Scanned PDF & Test Papers Uploads ---");

    const samplePdfBuffer = Buffer.from(
      "%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n%%EOF",
    );
    const scannedPdfFile = createMockFile({
      originalname: "engineering_mechanics_midterm_2024.pdf",
      mimetype: "application/pdf",
      buffer: samplePdfBuffer,
    });

    const scanResult = await storageController.uploadScan(scannedPdfFile, {
      scanJobId: "scan-job-mech-2024",
    });

    assert(
      scanResult.key.startsWith("scans/scan-job-mech-2024/"),
      "Scan PDF stored under scans/scan-job-id/ key hierarchy",
    );
    assert(
      scanResult.mimeType === "application/pdf",
      "Scan PDF preserved application/pdf MIME type",
    );
    assert(
      scanResult.sizeBytes === samplePdfBuffer.length,
      "Scan PDF size matches original PDF buffer length",
    );

    const scanDownloaded = await storageService.download(scanResult.key);
    assert(
      scanDownloaded.equals(samplePdfBuffer),
      "Downloaded scan PDF matches binary PDF buffer",
    );

    // Scanned image page (e.g. WebP exam page scan)
    const scannedWebpBuffer = Buffer.from("RIFF....WEBPVP8 sample exam page");
    const scannedWebpFile = createMockFile({
      originalname: "math_quiz_page1.webp",
      mimetype: "image/webp",
      buffer: scannedWebpBuffer,
    });

    const scanPageResult = await storageController.uploadScan(scannedWebpFile, {
      scanJobId: "job-math-p1",
    });
    assert(
      scanPageResult.key.startsWith("scans/job-math-p1/"),
      "Scanned WebP image page stored properly",
    );

    // ----------------------------------------------------
    // 4. Course Document Upload Tests
    // ----------------------------------------------------
    console.log("\n--- 4. Course Document Uploads ---");

    const lectureDocBuffer = Buffer.from("%PDF-1.5 Lecture Note Chapter 1: Introduction to Calculus");
    const lectureDocFile = createMockFile({
      originalname: "Calculus_Chapter_1.pdf",
      mimetype: "application/pdf",
      buffer: lectureDocBuffer,
    });

    const docResult = await storageController.uploadDocument(lectureDocFile, {
      courseId: "course-calculus-101",
    });

    assert(
      docResult.key.startsWith("courses/course-calculus-101/documents/"),
      "Course document placed in course documents folder",
    );
    assert(docResult.mimeType === "application/pdf", "Course document MIME type is application/pdf");

    // ----------------------------------------------------
    // 5. Generic Upload & Querying
    // ----------------------------------------------------
    console.log("\n--- 5. Generic Upload & Querying ---");

    const avatarBuffer = Buffer.from("image avatar png content");
    const avatarFile = createMockFile({
      originalname: "student_profile.png",
      mimetype: "image/png",
      buffer: avatarBuffer,
    });

    const genResult = await storageController.genericUpload(avatarFile, {
      folder: "avatars",
    });
    assert(genResult.key.startsWith("avatars/"), "Generic upload placed in specified folder");

    // Test getUrl
    const urlResponse = await storageController.getUrl({ key: genResult.key });
    assert(urlResponse.key === genResult.key, "getUrl returns requested key");
    assert(urlResponse.url.includes(genResult.key), "getUrl returns complete accessible URL");

    // Test getFile (stream inline)
    const mockResHeaders: Record<string, any> = {};
    let endedBuffer: Buffer | null = null;
    const mockRes: any = {
      setHeader: (name: string, value: any) => {
        mockResHeaders[name] = value;
      },
      end: (data: Buffer) => {
        endedBuffer = data;
      },
    };

    await storageController.getFile({ key: genResult.key }, mockRes);
    assert(mockResHeaders["Content-Type"] === "image/png", "getFile sets correct Content-Type header");
    assert(endedBuffer !== null && (endedBuffer as Buffer).equals(avatarBuffer), "getFile sends correct buffer");

    // Test downloadFile (attachment)
    const mockDownloadHeaders: Record<string, any> = {};
    let downloadEndedBuffer: Buffer | null = null;
    const mockDownloadRes: any = {
      setHeader: (name: string, value: any) => {
        mockDownloadHeaders[name] = value;
      },
      end: (data: Buffer) => {
        downloadEndedBuffer = data;
      },
    };

    await storageController.downloadFile({ key: docResult.key }, mockDownloadRes);
    assert(
      mockDownloadHeaders["Content-Disposition"]?.includes("attachment"),
      "downloadFile sets attachment Content-Disposition header",
    );
    assert(
      downloadEndedBuffer !== null && (downloadEndedBuffer as Buffer).equals(lectureDocBuffer),
      "downloadFile sends intact lecture document buffer",
    );

    // ----------------------------------------------------
    // 6. Security & Validation Failure Handling
    // ----------------------------------------------------
    console.log("\n--- 6. Security & Validation Failure Handling ---");

    // Test 6a: Missing file
    try {
      await storageController.uploadReceipt(undefined, {}, { id: "test" });
      assert(false, "Missing file should throw BadRequestException");
    } catch (err: any) {
      assert(
        err instanceof BadRequestException,
        "Missing file throws BadRequestException",
      );
      assert(
        err.getResponse()?.errorCode === "VALIDATION_FAILED",
        "Missing file error code is VALIDATION_FAILED",
      );
    }

    // Test 6b: Empty file (0 bytes)
    try {
      const emptyFile = createMockFile({
        originalname: "empty.jpg",
        mimetype: "image/jpeg",
        buffer: Buffer.alloc(0),
      });
      await storageController.uploadReceipt(emptyFile, {}, { id: "test" });
      assert(false, "Empty file should throw BadRequestException");
    } catch (err: any) {
      assert(
        err instanceof BadRequestException,
        "Empty file throws BadRequestException",
      );
      assert(
        err.getResponse()?.message?.includes("empty"),
        "Empty file error message mentions empty file",
      );
    }

    // Test 6c: Disallowed MIME type for receipt (e.g. application/pdf for receipt)
    try {
      const invalidMimeFile = createMockFile({
        originalname: "fake_receipt.pdf",
        mimetype: "application/pdf",
        buffer: Buffer.from("pdf-data"),
      });
      await storageController.uploadReceipt(invalidMimeFile, {}, { id: "test" });
      assert(false, "PDF receipt should throw INVALID_FILE_TYPE");
    } catch (err: any) {
      assert(
        err instanceof BadRequestException,
        "Disallowed MIME type throws BadRequestException",
      );
      assert(
        err.getResponse()?.errorCode === "INVALID_FILE_TYPE",
        "Error code is INVALID_FILE_TYPE",
      );
    }

    // Test 6d: Dangerous file extension (.exe, .sh, .php)
    try {
      const dangerousFile = createMockFile({
        originalname: "malicious_payload.exe",
        mimetype: "image/jpeg",
        buffer: Buffer.from("fake exe buffer"),
      });
      await storageController.uploadReceipt(dangerousFile, {}, { id: "test" });
      assert(false, "Dangerous extension should throw DANGEROUS_FILE_EXTENSION");
    } catch (err: any) {
      assert(
        err instanceof BadRequestException,
        "Dangerous file extension throws BadRequestException",
      );
      assert(
        err.getResponse()?.errorCode === "DANGEROUS_FILE_EXTENSION",
        "Error code is DANGEROUS_FILE_EXTENSION",
      );
    }

    // Test 6e: File exceeding size limit (> 10MB receipt)
    try {
      const oversizedBuffer = Buffer.alloc(MAX_RECEIPT_BYTES + 1024); // 10MB + 1KB
      const oversizedFile = createMockFile({
        originalname: "huge_receipt.jpg",
        mimetype: "image/jpeg",
        buffer: oversizedBuffer,
      });
      await storageController.uploadReceipt(oversizedFile, {}, { id: "test" });
      assert(false, "Oversized file should throw FILE_TOO_LARGE");
    } catch (err: any) {
      assert(
        err instanceof BadRequestException,
        "Oversized file throws BadRequestException",
      );
      assert(
        err.getResponse()?.errorCode === "FILE_TOO_LARGE",
        "Error code is FILE_TOO_LARGE",
      );
    }

    // Test 6f: Non-existent file retrieval throws NotFoundException
    try {
      await storageController.getFile({ key: "non-existent-key.jpg" }, mockRes);
      assert(false, "Retrieving non-existent file should throw NotFoundException");
    } catch (err: any) {
      assert(
        err instanceof NotFoundException,
        "Non-existent key throws NotFoundException",
      );
    }

    // Cleanup scratch directory
    await fs.rm(testStorageDir, { recursive: true, force: true });

    console.log(`\n=================================================`);
    console.log(`Test Summary: ${passed} passed, ${failed} failed`);
    console.log(`=================================================\n`);

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error("Test execution encountered unexpected error:", err);
    process.exit(1);
  }
}

runStorageUploadTests();
