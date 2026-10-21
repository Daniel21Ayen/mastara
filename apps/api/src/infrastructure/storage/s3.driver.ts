import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import * as crypto from "crypto";
import { Readable } from "stream";
import { StorageDriver, StorageUploadResult } from "./storage.interface";

@Injectable()
export class S3Driver implements StorageDriver {
  private readonly logger = new Logger(S3Driver.name);
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly publicBaseUrl?: string;

  constructor(private readonly config: ConfigService) {
    this.bucket = this.config.get<string>("S3_BUCKET") || "mastara-storage";
    const region = this.config.get<string>("S3_REGION") || "us-east-1";
    const endpoint = this.config.get<string>("S3_ENDPOINT");
    const accessKeyId = this.config.get<string>("S3_ACCESS_KEY_ID") || "";
    const secretAccessKey = this.config.get<string>("S3_SECRET_ACCESS_KEY") || "";
    const forcePathStyle =
      this.config.get<string>("S3_FORCE_PATH_STYLE") === "true" || !!endpoint;
    this.publicBaseUrl = this.config.get<string>("S3_PUBLIC_BASE_URL");

    this.client = new S3Client({
      region,
      endpoint: endpoint || undefined,
      forcePathStyle,
      credentials:
        accessKeyId && secretAccessKey
          ? {
              accessKeyId,
              secretAccessKey,
            }
          : undefined,
    });
  }

  async upload(
    key: string,
    data: Buffer | Uint8Array | string,
    mimeType = "application/octet-stream",
  ): Promise<StorageUploadResult> {
    const buffer = Buffer.isBuffer(data)
      ? data
      : typeof data === "string"
      ? Buffer.from(data, "utf8")
      : Buffer.from(data);

    const checksumSha256 = crypto
      .createHash("sha256")
      .update(buffer)
      .digest("hex");

    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: mimeType,
      }),
    );

    const url = this.publicBaseUrl
      ? `${this.publicBaseUrl}/${key}`
      : await this.getSignedUrl(key, 86400);

    this.logger.debug(`Uploaded S3 object: ${key} to bucket: ${this.bucket}`);

    return {
      key,
      url,
      sizeBytes: buffer.length,
      mimeType,
      checksumSha256,
    };
  }

  async download(key: string): Promise<Buffer> {
    const response = await this.client.send(
      new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      }),
    );

    if (!response.Body) {
      throw new Error(`Empty body returned for S3 object: ${key}`);
    }

    const stream = response.Body as Readable;
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    return Buffer.concat(chunks);
  }

  async delete(key: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      }),
    );
  }

  async getSignedUrl(key: string, expiresInSeconds = 3600): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });
    return getSignedUrl(this.client, command, { expiresIn: expiresInSeconds });
  }

  async exists(key: string): Promise<boolean> {
    try {
      await this.client.send(
        new HeadObjectCommand({
          Bucket: this.bucket,
          Key: key,
        }),
      );
      return true;
    } catch {
      return false;
    }
  }
}
