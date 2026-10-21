import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as fs from "fs/promises";
import * as path from "path";
import * as crypto from "crypto";
import { StorageDriver, StorageUploadResult } from "./storage.interface";

@Injectable()
export class LocalDriver implements StorageDriver {
  private readonly logger = new Logger(LocalDriver.name);
  private readonly baseDir: string;
  private readonly publicBaseUrl: string;

  constructor(private readonly config: ConfigService) {
    const rawDir = this.config.get<string>("STORAGE_LOCAL_DIR") || "uploads";
    this.baseDir = path.isAbsolute(rawDir)
      ? rawDir
      : path.join(process.cwd(), rawDir);
    this.publicBaseUrl =
      this.config.get<string>("STORAGE_PUBLIC_BASE_URL") || "/uploads";
  }

  private resolvePath(key: string): string {
    const sanitizedKey = key.replace(/^[/\\]+/, "");
    return path.join(this.baseDir, sanitizedKey);
  }

  async upload(
    key: string,
    data: Buffer | Uint8Array | string,
    mimeType = "application/octet-stream",
  ): Promise<StorageUploadResult> {
    const filePath = this.resolvePath(key);
    await fs.mkdir(path.dirname(filePath), { recursive: true });

    const buffer = Buffer.isBuffer(data)
      ? data
      : typeof data === "string"
      ? Buffer.from(data, "utf8")
      : Buffer.from(data);

    await fs.writeFile(filePath, buffer);

    const checksumSha256 = crypto
      .createHash("sha256")
      .update(buffer)
      .digest("hex");

    const url = `${this.publicBaseUrl}/${key.replace(/\\/g, "/")}`;

    this.logger.debug(`Stored local file at ${filePath} (${buffer.length} bytes)`);

    return {
      key,
      url,
      sizeBytes: buffer.length,
      mimeType,
      checksumSha256,
    };
  }

  async download(key: string): Promise<Buffer> {
    const filePath = this.resolvePath(key);
    return fs.readFile(filePath);
  }

  async delete(key: string): Promise<void> {
    const filePath = this.resolvePath(key);
    try {
      await fs.unlink(filePath);
    } catch (err: any) {
      if (err.code !== "ENOENT") {
        throw err;
      }
    }
  }

  async getSignedUrl(key: string, _expiresInSeconds = 3600): Promise<string> {
    return `${this.publicBaseUrl}/${key.replace(/\\/g, "/")}`;
  }

  async exists(key: string): Promise<boolean> {
    const filePath = this.resolvePath(key);
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }
}
