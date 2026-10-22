// apps/api/src/infrastructure/storage/storage.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as path from 'path';
import { LocalStorageDriver } from './local.driver';
import { S3StorageDriver } from './s3.driver';
import type { StorageDriver, StorageUploadResult } from './storage.interface';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly s3Driver?: S3StorageDriver;
  private readonly localDriver: LocalStorageDriver;
  private readonly activeDriver: StorageDriver;
  private readonly driverType: 's3' | 'local';

  constructor(private readonly config: ConfigService) {
    const driver = this.config.get<string>('STORAGE_DRIVER', 'local').toLowerCase();
    this.driverType = driver === 's3' ? 's3' : 'local';

    const localDir = this.config.get<string>('STORAGE_LOCAL_DIR', './uploads');
    const publicBaseUrl = this.config.get<string>('STORAGE_PUBLIC_BASE_URL', '/uploads');
    this.localDriver = new LocalStorageDriver(localDir, publicBaseUrl);

    if (this.driverType === 's3') {
      const endpoint = this.config.get<string>('MINIO_ENDPOINT') || this.config.get<string>('S3_ENDPOINT');
      const accessKeyId =
        this.config.get<string>('MINIO_ACCESS_KEY') ||
        this.config.get<string>('AWS_ACCESS_KEY_ID') ||
        this.config.get<string>('S3_ACCESS_KEY_ID') ||
        'mastara_admin';
      const secretAccessKey =
        this.config.get<string>('MINIO_SECRET_KEY') ||
        this.config.get<string>('AWS_SECRET_ACCESS_KEY') ||
        this.config.get<string>('S3_SECRET_ACCESS_KEY') ||
        'mastara_minio_pass_2026';
      const bucket =
        this.config.get<string>('MINIO_BUCKET') ||
        this.config.get<string>('AWS_S3_BUCKET') ||
        this.config.get<string>('S3_BUCKET') ||
        'mastara-uploads';
      const region = this.config.get<string>('MINIO_REGION') || this.config.get<string>('S3_REGION') || 'us-east-1';

      this.s3Driver = new S3StorageDriver({
        endpoint,
        accessKeyId,
        secretAccessKey,
        bucket,
        region,
        forcePathStyle: true,
      });
      this.activeDriver = this.s3Driver;
      this.logger.log(`Initialized S3 / MinIO storage driver (Bucket: ${bucket})`);
    } else {
      this.activeDriver = this.localDriver;
      this.logger.log(`Initialized Local storage driver (Dir: ${localDir})`);
    }
  }

  /**
   * Upload payment proof receipt image
   */
  async uploadReceipt(
    orderId: string,
    filename: string,
    data: Buffer | Uint8Array,
    mimeType = 'image/jpeg',
  ): Promise<StorageUploadResult> {
    const ext = path.extname(filename) || '.jpg';
    const key = `receipts/${orderId}-${Date.now()}${ext}`;
    this.logger.log(`Uploading payment receipt to ${key}`);
    return this.activeDriver.upload(key, data, mimeType);
  }

  /**
   * Upload course document / lecture PDF asset
   */
  async uploadDocument(
    courseId: string,
    filename: string,
    data: Buffer | Uint8Array,
    mimeType = 'application/pdf',
  ): Promise<StorageUploadResult> {
    const key = `courses/${courseId}/documents/${Date.now()}-${filename}`;
    this.logger.log(`Uploading course document asset to ${key}`);
    return this.activeDriver.upload(key, data, mimeType);
  }

  /**
   * Upload scanned test paper or question image
   */
  async uploadScan(
    scanJobId: string,
    filename: string,
    data: Buffer | Uint8Array,
    mimeType = 'image/jpeg',
  ): Promise<StorageUploadResult> {
    const key = `scans/${scanJobId}/${Date.now()}-${filename}`;
    this.logger.log(`Uploading scan asset to ${key}`);
    return this.activeDriver.upload(key, data, mimeType);
  }

  /**
   * Generic file upload
   */
  async upload(
    key: string,
    data: Buffer | Uint8Array | string,
    mimeType?: string,
  ): Promise<StorageUploadResult> {
    return this.activeDriver.upload(key, data, mimeType);
  }

  /**
   * Get accessible URL (signed or public) for client consumption
   */
  async getUrl(key: string, expiresInSeconds = 3600): Promise<string> {
    return this.activeDriver.getSignedUrl(key, expiresInSeconds);
  }

  /**
   * Download raw file buffer
   */
  async download(key: string): Promise<Buffer> {
    return this.activeDriver.download(key);
  }

  /**
   * Delete asset by storage key
   */
  async delete(key: string): Promise<void> {
    return this.activeDriver.delete(key);
  }

  /**
   * Check if asset exists
   */
  async exists(key: string): Promise<boolean> {
    return this.activeDriver.exists(key);
  }

  async getUploadUrl(
    key: string,
    contentType: string,
    expiresIn = 900,
  ): Promise<{ key: string; uploadUrl: string; publicUrl: string }> {
    if (this.driverType === 's3' && this.s3Driver) {
      return this.s3Driver.getUploadUrl(key, contentType, expiresIn);
    }
    const port = this.config.get<number>('PORT', 3000);
    const host = this.config.get<string>('API_HOST', 'localhost');
    return this.localDriver.getUploadUrl(key, contentType, `http://${host}:${port}`);
  }

  async getDownloadUrl(key: string, expiresIn = 3600): Promise<string> {
    if (this.driverType === 's3' && this.s3Driver) {
      return this.s3Driver.getDownloadUrl(key, expiresIn);
    }
    const port = this.config.get<number>('PORT', 3000);
    const host = this.config.get<string>('API_HOST', 'localhost');
    return this.localDriver.getDownloadUrl(key, `http://${host}:${port}`);
  }

  async uploadBuffer(key: string, buffer: Buffer, contentType: string): Promise<void> {
    if (this.driverType === 's3' && this.s3Driver) {
      await this.s3Driver.uploadBuffer(key, buffer, contentType);
      return;
    }
    await this.localDriver.saveFile(key, buffer);
  }

  async downloadBuffer(key: string): Promise<Buffer> {
    if (this.driverType === 's3' && this.s3Driver) {
      return this.s3Driver.downloadBuffer(key);
    }
    return this.localDriver.readFile(key);
  }

  getLocalDriver(): LocalStorageDriver {
    return this.localDriver;
  }

  getDriver(): StorageDriver {
    return this.activeDriver;
  }
}
