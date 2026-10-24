import { BadRequestException } from "@nestjs/common";
import * as path from "path";

export const RECEIPT_ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
];

export const DOCUMENT_ALLOWED_MIME_TYPES = [
  "application/pdf",
  "application/x-pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
];

// Strictly enforce 300 KB maximum file size for payment receipts per security policy
export const MAX_RECEIPT_BYTES = 300 * 1024; // 300 KB
export const MAX_DOCUMENT_BYTES = 50 * 1024 * 1024; // 50MB
export const MAX_GENERIC_BYTES = 50 * 1024 * 1024; // 50MB
export const MAX_BULK_IMPORT_BYTES = 10 * 1024 * 1024; // 10MB

export const BULK_IMPORT_ALLOWED_MIME_TYPES = [
  "text/csv",
  "application/json",
  "text/plain",
  "application/vnd.ms-excel",
  "application/csv",
  "text/x-csv",
];

export const DISALLOWED_EXTENSIONS = [
  ".exe",
  ".sh",
  ".bat",
  ".cmd",
  ".js",
  ".ts",
  ".php",
  ".py",
  ".vbs",
  ".jar",
];

/**
 * Inspect magic bytes of the buffer to determine genuine file type.
 */
export function detectMagicMimeType(buffer: Buffer): string | null {
  if (!buffer || buffer.length < 4) return null;

  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "image/jpeg";
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return "image/png";
  }

  // PDF: 25 50 44 46 (%PDF)
  if (
    buffer[0] === 0x25 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x44 &&
    buffer[3] === 0x46
  ) {
    return "application/pdf";
  }

  // WebP: RIFF....WEBP
  if (
    buffer.length >= 12 &&
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    return "image/webp";
  }

  return null;
}

/**
 * Strip EXIF and metadata segments (APP1 marker 0xFFE1) from JPEG buffer
 * to protect student privacy and remove location/device traces.
 */
export function stripExifMetadata(buffer: Buffer, mimeType: string): Buffer {
  if (mimeType !== "image/jpeg" || buffer.length < 4) {
    return buffer;
  }

  // Verify SOI (Start of Image)
  if (buffer[0] !== 0xff || buffer[1] !== 0xd8) {
    return buffer;
  }

  const chunks: Buffer[] = [buffer.subarray(0, 2)]; // Preserve SOI
  let offset = 2;

  while (offset < buffer.length - 1) {
    if (buffer[offset] !== 0xff) {
      break;
    }

    const marker = buffer[offset + 1];

    // SOS (Start of Scan): Image compressed stream begins here
    if (marker === 0xda) {
      chunks.push(buffer.subarray(offset));
      break;
    }

    if (offset + 4 > buffer.length) {
      break;
    }

    const length = buffer.readUInt16BE(offset + 2);

    // Marker 0xE1 = APP1 (EXIF / XMP metadata). Skip it!
    if (marker === 0xe1) {
      offset += 2 + length;
      continue;
    }

    // Keep all other structural headers (SOF, DHT, DQT, etc.)
    chunks.push(buffer.subarray(offset, offset + 2 + length));
    offset += 2 + length;
  }

  return Buffer.concat(chunks);
}

export function sanitizeFilename(originalName: string): string {
  if (!originalName) return "file";
  const normalized = originalName.replace(/\\/g, "/");
  const baseName = path.posix.basename(normalized);
  const clean = baseName
    .replace(/[/\\?%*:|"<>]/g, "-")
    .replace(/\.\./g, "")
    .replace(/-+/g, "-")
    .replace(/-\./g, ".")
    .replace(/^-+|-+$/g, "");
  return clean.trim() || "file";
}

export interface ValidateFileOptions {
  maxBytes: number;
  allowedMimes?: string[];
  disallowedExtensions?: string[];
  verifyMagicBytes?: boolean;
  stripExif?: boolean;
}

export function validateUploadedFile(
  file: Express.Multer.File | undefined,
  options: ValidateFileOptions,
): Express.Multer.File {
  if (!file || !file.buffer) {
    throw new BadRequestException({
      errorCode: "VALIDATION_FAILED",
      message: "No file uploaded. Please attach a file using the 'file' field.",
    });
  }

  if (file.size === 0 || file.buffer.length === 0) {
    throw new BadRequestException({
      errorCode: "VALIDATION_FAILED",
      message: "The uploaded file is empty.",
    });
  }

  // 1. Enforce strict size limit (e.g. 300 KB for receipts)
  if (file.size > options.maxBytes || file.buffer.length > options.maxBytes) {
    const maxKb = Math.round(options.maxBytes / 1024);
    throw new BadRequestException({
      errorCode: "FILE_TOO_LARGE",
      message: `File size (${(file.size / 1024).toFixed(1)} KB) exceeds the strict maximum limit of ${maxKb} KB.`,
    });
  }

  // 2. Disallowed extension check
  const ext = file.originalname
    ? file.originalname.slice(file.originalname.lastIndexOf(".")).toLowerCase()
    : "";
  if (options.disallowedExtensions?.includes(ext)) {
    throw new BadRequestException({
      errorCode: "DANGEROUS_FILE_EXTENSION",
      message: `File extension '${ext}' is not permitted for security reasons.`,
    });
  }

  // 3. Genuine Magic Byte verification
  const magicMime = detectMagicMimeType(file.buffer);
  if (options.verifyMagicBytes !== false && options.allowedMimes && options.allowedMimes.length > 0) {
    if (!magicMime || !options.allowedMimes.includes(magicMime)) {
      throw new BadRequestException({
        errorCode: "INVALID_MAGIC_BYTES",
        message: `File contents signature does not match permitted file types (${options.allowedMimes.join(", ")}).`,
      });
    }
  }

  // 4. Strip EXIF metadata if requested
  if (options.stripExif !== false && (magicMime === "image/jpeg" || file.mimetype === "image/jpeg")) {
    file.buffer = stripExifMetadata(file.buffer, "image/jpeg");
    file.size = file.buffer.length;
  }

  return file;
}
