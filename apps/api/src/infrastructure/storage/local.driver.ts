// apps/api/src/infrastructure/storage/local.driver.ts
import * as fs from 'fs';
import * as path from 'path';

export class LocalStorageDriver {
  private readonly uploadDir: string;

  constructor(uploadDir = './uploads') {
    this.uploadDir = path.resolve(process.cwd(), uploadDir);
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  async getUploadUrl(key: string, _contentType: string, baseUrl = 'http://localhost:4001'): Promise<{ key: string; uploadUrl: string; publicUrl: string }> {
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
    const safeKey = key.replace(/\.\./g, '');
    const filePath = path.join(this.uploadDir, safeKey);
    const parentDir = path.dirname(filePath);
    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true });
    }
    await fs.promises.writeFile(filePath, buffer);
    return filePath;
  }

  async readFile(key: string): Promise<Buffer> {
    const safeKey = key.replace(/\.\./g, '');
    const filePath = path.join(this.uploadDir, safeKey);
    return fs.promises.readFile(filePath);
  }

  async exists(key: string): Promise<boolean> {
    const safeKey = key.replace(/\.\./g, '');
    const filePath = path.join(this.uploadDir, safeKey);
    return fs.existsSync(filePath);
  }
}
