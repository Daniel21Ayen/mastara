// apps/api/src/infrastructure/storage/local.driver.ts
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import type { StorageDriver, StorageUploadResult } from './storage.interface';

export class LocalStorageDriver implements StorageDriver {
  private readonly uploadDir: string;
  private readonly publicBaseUrl: string;

  constructor(uploadDir = './uploads', publicBaseUrl = '/uploads') {
    this.uploadDir = path.resolve(process.cwd(), uploadDir);
    this.publicBaseUrl = publicBaseUrl;
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  private resolvePath(key: string): string {
    const safeKey = key.replace(/\.\./g, '').replace(/^[/\\]+/, '');
    return path.join(this.uploadDir, safeKey);
  }

  async getUploadUrl(
    key: string,
    _contentType: string,
    baseUrl = 'http://localhost:4001',
  ): Promise<{ key: string; uploadUrl: string; publicUrl: string }> {
    const safeKey = key.replace(/\.\./g, '');
    const uploadUrl = `${baseUrl}/content/admin/scans/storage-upload/${encodeURIComponent(safeKey)}`;
    const publicUrl = `${baseUrl}/content/admin/scans/storage-download/${encodeURIComponent(safeKey)}`;
    return { key: safeKey, uploadUrl, publicUrl };
  }

  async getDownloadUrl(key: string, baseUrl = 'http://localhost:4001'): Promise<string> {
    const safeKey = key.replace(/\.\./g, '');
    return `${baseUrl}/content/admin/scans/storage-download/${encodeURIComponent(safeKey)}`;
  }

  async saveFile(key: string, buffer: Buffer): Promise<string> {
    const filePath = this.resolvePath(key);
    const parentDir = path.dirname(filePath);
    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true });
    }
    await fs.promises.writeFile(filePath, buffer);
    return filePath;
  }

  async readFile(key: string): Promise<Buffer> {
    const filePath = this.resolvePath(key);
    return fs.promises.readFile(filePath);
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

    await this.saveFile(key, buffer);
    const checksumSha256 = crypto.createHash('sha256').update(buffer).digest('hex');
    const url = `${this.publicBaseUrl}/${key.replace(/\\/g, '/')}`;

    return {
      key,
      url,
      sizeBytes: buffer.length,
      mimeType,
      checksumSha256,
    };
  }

  async download(key: string): Promise<Buffer> {
    return this.readFile(key);
  }

  async delete(key: string): Promise<void> {
    const filePath = this.resolvePath(key);
    try {
      await fs.promises.unlink(filePath);
    } catch (err: any) {
      if (err.code !== 'ENOENT') throw err;
    }
  }

  async getSignedUrl(key: string, _expiresInSeconds = 3600): Promise<string> {
    return `${this.publicBaseUrl}/${key.replace(/\\/g, '/')}`;
  }

  async exists(key: string): Promise<boolean> {
    const filePath = this.resolvePath(key);
    return fs.existsSync(filePath);
  }
}

export const LocalDriver = LocalStorageDriver;
