// apps/api/src/infrastructure/storage/storage.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LocalStorageDriver } from './local.driver';
import { S3StorageDriver } from './s3.driver';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly s3Driver?: S3StorageDriver;
  private readonly localDriver: LocalStorageDriver;
  private readonly driverType: 's3' | 'local';

  constructor(private readonly config: ConfigService) {
    const driver = this.config.get<string>('STORAGE_DRIVER', 'local').toLowerCase();
    this.driverType = driver === 's3' ? 's3' : 'local';

    const localDir = this.config.get<string>('STORAGE_LOCAL_DIR', './uploads');
    this.localDriver = new LocalStorageDriver(localDir);

    if (this.driverType === 's3') {
      const endpoint = this.config.get<string>('MINIO_ENDPOINT');
      const accessKeyId =
        this.config.get<string>('MINIO_ACCESS_KEY') ||
        this.config.get<string>('AWS_ACCESS_KEY_ID') ||
        'mastara_admin';
      const secretAccessKey =
        this.config.get<string>('MINIO_SECRET_KEY') ||
        this.config.get<string>('AWS_SECRET_ACCESS_KEY') ||
        'mastara_minio_pass_2026';
      const bucket =
        this.config.get<string>('MINIO_BUCKET') ||
        this.config.get<string>('AWS_S3_BUCKET') ||
        'mastara-uploads';
      const region = this.config.get<string>('MINIO_REGION', 'us-east-1');

      this.s3Driver = new S3StorageDriver({
        endpoint,
        accessKeyId,
        secretAccessKey,
        bucket,
        region,
        forcePathStyle: true,
      });
      this.logger.log(`Initialized S3 / MinIO storage driver (Bucket: ${bucket})`);
    } else {
      this.logger.log(`Initialized Local storage driver (Dir: ${localDir})`);
    }
  }

  async getUploadUrl(
    key: string,
    contentType: string,
    expiresIn = 900,
  ): Promise<{ key: string; uploadUrl: string; publicUrl: string }> {
    if (this.driverType === 's3' && this.s3Driver) {
      return this.s3Driver.getUploadUrl(key, contentType, expiresIn);
    }
    const port = this.config.get<number>('PORT', 4001);
    const host = this.config.get<string>('API_HOST', 'localhost');
    return this.localDriver.getUploadUrl(key, contentType, `http://${host}:${port}`);
  }

  async getDownloadUrl(key: string, expiresIn = 3600): Promise<string> {
    if (this.driverType === 's3' && this.s3Driver) {
      return this.s3Driver.getDownloadUrl(key, expiresIn);
    }
    const port = this.config.get<number>('PORT', 4001);
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

  async exists(key: string): Promise<boolean> {
    if (this.driverType === 's3' && this.s3Driver) {
      return this.s3Driver.exists(key);
    }
    return this.localDriver.exists(key);
  }

  getLocalDriver(): LocalStorageDriver {
    return this.localDriver;
  }
}
