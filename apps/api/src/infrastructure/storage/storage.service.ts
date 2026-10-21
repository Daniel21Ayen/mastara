import { Inject, Injectable, Logger } from "@nestjs/common";
import { STORAGE_DRIVER, StorageDriver, StorageUploadResult } from "./storage.interface";
import * as path from "path";

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);

  constructor(
    @Inject(STORAGE_DRIVER)
    private readonly driver: StorageDriver,
  ) {}

  /**
   * Upload payment proof receipt image
   */
  async uploadReceipt(
    orderId: string,
    filename: string,
    data: Buffer | Uint8Array,
    mimeType = "image/jpeg",
  ): Promise<StorageUploadResult> {
    const ext = path.extname(filename) || ".jpg";
    const key = `receipts/${orderId}-${Date.now()}${ext}`;
    this.logger.log(`Uploading payment receipt to ${key}`);
    return this.driver.upload(key, data, mimeType);
  }

  /**
   * Upload course document / lecture PDF asset
   */
  async uploadDocument(
    courseId: string,
    filename: string,
    data: Buffer | Uint8Array,
    mimeType = "application/pdf",
  ): Promise<StorageUploadResult> {
    const key = `courses/${courseId}/documents/${Date.now()}-${filename}`;
    this.logger.log(`Uploading course document asset to ${key}`);
    return this.driver.upload(key, data, mimeType);
  }

  /**
   * Upload scanned test paper or question image
   */
  async uploadScan(
    scanJobId: string,
    filename: string,
    data: Buffer | Uint8Array,
    mimeType = "image/jpeg",
  ): Promise<StorageUploadResult> {
    const key = `scans/${scanJobId}/${Date.now()}-${filename}`;
    this.logger.log(`Uploading scan asset to ${key}`);
    return this.driver.upload(key, data, mimeType);
  }

  /**
   * Generic file upload
   */
  async upload(
    key: string,
    data: Buffer | Uint8Array | string,
    mimeType?: string,
  ): Promise<StorageUploadResult> {
    return this.driver.upload(key, data, mimeType);
  }

  /**
   * Get accessible URL (signed or public) for client consumption
   */
  async getUrl(key: string, expiresInSeconds = 3600): Promise<string> {
    return this.driver.getSignedUrl(key, expiresInSeconds);
  }

  /**
   * Download raw file buffer
   */
  async download(key: string): Promise<Buffer> {
    return this.driver.download(key);
  }

  /**
   * Delete asset by storage key
   */
  async delete(key: string): Promise<void> {
    return this.driver.delete(key);
  }

  /**
   * Check if asset exists
   */
  async exists(key: string): Promise<boolean> {
    return this.driver.exists(key);
  }
}
