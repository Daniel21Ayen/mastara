export interface StorageUploadResult {
  key: string;
  url: string;
  sizeBytes: number;
  mimeType: string;
  checksumSha256?: string;
}

export interface StorageDriver {
  upload(
    key: string,
    data: Buffer | Uint8Array | string,
    mimeType?: string,
  ): Promise<StorageUploadResult>;

  download(key: string): Promise<Buffer>;

  delete(key: string): Promise<void>;

  getSignedUrl(key: string, expiresInSeconds?: number): Promise<string>;

  exists(key: string): Promise<boolean>;
}

export const STORAGE_DRIVER = "STORAGE_DRIVER";
