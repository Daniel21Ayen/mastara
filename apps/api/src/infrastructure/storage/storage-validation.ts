import { BadRequestException } from "@nestjs/common";

export const RECEIPT_ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
];

export const DOCUMENT_ALLOWED_MIME_TYPES = [
  "application/pdf",
  "application/x-pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
];

export const MAX_RECEIPT_BYTES = 10 * 1024 * 1024; // 10MB
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

import * as path from "path";

export function sanitizeFilename(originalName: string): string {
  if (!originalName) return "file";
  // Strip path traversal and normalize slashes
  const normalized = originalName.replace(/\\/g, "/");
  const baseName = path.posix.basename(normalized);
  // Remove dangerous characters and any residual '..'
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

  if (file.size > options.maxBytes) {
    const maxMb = Math.round(options.maxBytes / (1024 * 1024));
    throw new BadRequestException({
      errorCode: "FILE_TOO_LARGE",
      message: `File size (${(file.size / (1024 * 1024)).toFixed(2)} MB) exceeds the maximum limit of ${maxMb} MB.`,
    });
  }

  if (options.allowedMimes && options.allowedMimes.length > 0) {
    const isAllowed = options.allowedMimes.some(
      (mime) => mime.toLowerCase() === file.mimetype.toLowerCase(),
    );
    if (!isAllowed) {
      throw new BadRequestException({
        errorCode: "INVALID_FILE_TYPE",
        message: `MIME type '${file.mimetype}' is not allowed. Allowed types: ${options.allowedMimes.join(", ")}`,
      });
    }
  }

  const ext = file.originalname
    ? file.originalname.slice(file.originalname.lastIndexOf(".")).toLowerCase()
    : "";
  if (options.disallowedExtensions?.includes(ext)) {
    throw new BadRequestException({
      errorCode: "DANGEROUS_FILE_EXTENSION",
      message: `File extension '${ext}' is not permitted for security reasons.`,
    });
  }

  return file;
}
