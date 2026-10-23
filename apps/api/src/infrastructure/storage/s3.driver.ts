// apps/api/src/infrastructure/storage/s3.driver.ts
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import * as crypto from 'crypto';
import type { StorageDriver, StorageUploadResult } from './storage.interface';

export interface S3Config {
  endpoint?: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  region?: string;
  forcePathStyle?: boolean;
}

export class S3StorageDriver implements StorageDriver {
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor(config?: S3Config) {
    const cfg = config || {
      bucket: 'mastara-uploads',
      accessKeyId: 'mastara_admin',
      secretAccessKey: 'mastara_minio_pass_2026',
    };
    this.bucket = cfg.bucket;
    this.client = new S3Client({
      region: cfg.region || 'us-east-1',
      endpoint: cfg.endpoint,
      credentials: {
        accessKeyId: cfg.accessKeyId,
        secretAccessKey: cfg.secretAccessKey,
      },
      forcePathStyle: cfg.forcePathStyle ?? true,
    });
  }

  async getUploadUrl(
    key: string,
    contentType: string,
    expiresIn = 900,
  ): Promise<{ key: string; uploadUrl: string; publicUrl: string }> {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: contentType,
    });
    const uploadUrl = await getSignedUrl(this.client, command, { expiresIn });
    const publicUrl = uploadUrl.split('?')[0] || uploadUrl;
    return { key, uploadUrl, publicUrl };
  }

  async getDownloadUrl(key: string, expiresIn = 3600): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });
    return getSignedUrl(this.client, command, { expiresIn });
  }

  async uploadBuffer(key: string, buffer: Buffer, contentType: string): Promise<void> {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    });
    await this.client.send(command);
  }

  async downloadBuffer(key: string): Promise<Buffer> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });
    const response = await this.client.send(command);
    if (!response.Body) {
      throw new Error(`Empty body for key ${key}`);
    }
    const byteArray = await response.Body.transformToByteArray();
    return Buffer.from(byteArray);
  }

  async upload(
    key: string,
    data: Buffer | Uint8Array | string,
    mimeType = 'application/octet-stream',
  ): Promise<StorageUploadResult> {
    const buffer = Buffer.isBuffer(data)
      ? data
      : typeof data === 'string'
      ? Buffer.from(data, 'utf8')
      : Buffer.from(data);

    await this.uploadBuffer(key, buffer, mimeType);

    const checksumSha256 = crypto
      .createHash('sha256')
      .update(buffer)
      .digest('hex');

    const url = await this.getDownloadUrl(key);

    return {
      key,
      url,
      sizeBytes: buffer.length,
      mimeType,
      checksumSha256,
    };
  }

  async download(key: string): Promise<Buffer> {
    return this.downloadBuffer(key);
  }

  async delete(key: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });
    await this.client.send(command);
  }

  async getSignedUrl(key: string, expiresInSeconds = 3600): Promise<string> {
    return this.getDownloadUrl(key, expiresInSeconds);
  }

  async exists(key: string): Promise<boolean> {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });
      await this.client.send(command);
      return true;
    } catch {
      return false;
    }
  }
}

export const S3Driver = S3StorageDriver;
