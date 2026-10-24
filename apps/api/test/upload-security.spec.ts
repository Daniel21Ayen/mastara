import "reflect-metadata";
import {
  detectMagicMimeType,
  stripExifMetadata,
  validateUploadedFile,
  MAX_RECEIPT_BYTES,
  RECEIPT_ALLOWED_MIME_TYPES,
  DISALLOWED_EXTENSIONS,
} from "../src/infrastructure/storage/storage-validation";
import { BadRequestException } from "@nestjs/common";

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

async function runUploadSecurityTests() {
  console.log("=== Testing Secure Uploads & Metadata Stripping ===\n");

  // 1. Magic Bytes Detection
  console.log("1. Magic Bytes Validation Tests:");
  const genuineJpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46]);
  const genuinePng = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00]);
  const genuinePdf = Buffer.from("%PDF-1.4 sample content for testing purposes");
  const fakeImageExecutable = Buffer.from([0x4d, 0x5a, 0x90, 0x00, 0x03, 0x00, 0x00, 0x00]); // MZ header (PE executable)

  assert(detectMagicMimeType(genuineJpeg) === "image/jpeg", "Detects genuine JPEG magic bytes");
  assert(detectMagicMimeType(genuinePng) === "image/png", "Detects genuine PNG magic bytes");
  assert(detectMagicMimeType(genuinePdf) === "application/pdf", "Detects genuine PDF magic bytes");
  assert(detectMagicMimeType(fakeImageExecutable) === null, "Rejects fake image containing executable bytes");

  // 2. Strict 300 KB Receipt Limit Enforcement
  console.log("\n2. Receipt Size Limit Tests:");
  assert(MAX_RECEIPT_BYTES === 300 * 1024, "MAX_RECEIPT_BYTES is set to exactly 300 KB");

  // 250 KB genuine JPEG -> should pass
  const validSizeBuffer = Buffer.alloc(250 * 1024);
  genuineJpeg.copy(validSizeBuffer, 0);
  const validFile: any = {
    originalname: "receipt.jpg",
    mimetype: "image/jpeg",
    size: validSizeBuffer.length,
    buffer: validSizeBuffer,
  };
  const validated = validateUploadedFile(validFile, {
    maxBytes: MAX_RECEIPT_BYTES,
    allowedMimes: RECEIPT_ALLOWED_MIME_TYPES,
    disallowedExtensions: DISALLOWED_EXTENSIONS,
  });
  assert(Boolean(validated), "Valid 250 KB receipt passes validation");

  // 350 KB receipt -> should be rejected
  const oversizeBuffer = Buffer.alloc(350 * 1024);
  genuineJpeg.copy(oversizeBuffer, 0);
  const oversizeFile: any = {
    originalname: "large_receipt.jpg",
    mimetype: "image/jpeg",
    size: oversizeBuffer.length,
    buffer: oversizeBuffer,
  };
  let oversizeThrew = false;
  try {
    validateUploadedFile(oversizeFile, {
      maxBytes: MAX_RECEIPT_BYTES,
      allowedMimes: RECEIPT_ALLOWED_MIME_TYPES,
      disallowedExtensions: DISALLOWED_EXTENSIONS,
    });
  } catch (err: any) {
    const res = err instanceof BadRequestException ? (err.getResponse() as any) : null;
    oversizeThrew = res?.errorCode === "FILE_TOO_LARGE";
  }
  assert(oversizeThrew, "Rejects receipt exceeding 300 KB limit with FILE_TOO_LARGE");

  // 3. Spoofed MIME Type Rejection
  console.log("\n3. Spoofed Extension & MIME Type Rejection:");
  const spoofedFile: any = {
    originalname: "receipt.jpg",
    mimetype: "image/jpeg",
    size: fakeImageExecutable.length,
    buffer: fakeImageExecutable,
  };
  let spoofedThrew = false;
  try {
    validateUploadedFile(spoofedFile, {
      maxBytes: MAX_RECEIPT_BYTES,
      allowedMimes: RECEIPT_ALLOWED_MIME_TYPES,
      disallowedExtensions: DISALLOWED_EXTENSIONS,
    });
  } catch (err: any) {
    const res = err instanceof BadRequestException ? (err.getResponse() as any) : null;
    spoofedThrew = res?.errorCode === "INVALID_MAGIC_BYTES";
  }
  assert(spoofedThrew, "Rejects spoofed JPEG with invalid magic bytes");

  // 4. EXIF Stripping
  console.log("\n4. EXIF Metadata Stripping Tests:");
  // Construct JPEG with APP1 EXIF segment (FF E1 [len] [data]) followed by SOS (FF DA)
  const exifData = Buffer.from("Exif\x00\x00GPSLatitude=9.0300,GPSLongitude=38.7400");
  const exifSegmentLen = exifData.length + 2;
  const exifSegment = Buffer.alloc(2 + exifSegmentLen);
  exifSegment[0] = 0xff;
  exifSegment[1] = 0xe1; // APP1
  exifSegment.writeUInt16BE(exifSegmentLen, 2);
  exifData.copy(exifSegment, 4);

  const sosSegment = Buffer.from([0xff, 0xda, 0x00, 0x0c, 0x01, 0x02, 0x03]);
  const jpegWithExif = Buffer.concat([
    Buffer.from([0xff, 0xd8]), // SOI
    exifSegment,               // APP1 EXIF
    sosSegment,                // SOS
  ]);

  assert(jpegWithExif.includes(Buffer.from("GPSLatitude")), "Sample JPEG contains EXIF GPS coordinates");
  const sanitizedJpeg = stripExifMetadata(jpegWithExif, "image/jpeg");
  assert(
    !sanitizedJpeg.includes(Buffer.from("GPSLatitude")),
    "stripExifMetadata completely removes APP1 and GPS coordinates from JPEG",
  );
  assert(
    sanitizedJpeg[0] === 0xff && sanitizedJpeg[1] === 0xd8,
    "Preserves JPEG SOI header after stripping",
  );

  console.log(`\nResults: ${passed} passed, ${failed} failed`);
  if (failed > 0) {
    process.exit(1);
  }
}

runUploadSecurityTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
