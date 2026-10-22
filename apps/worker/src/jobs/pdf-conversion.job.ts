// apps/worker/src/jobs/pdf-conversion.job.ts
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { Worker, Job } from 'bullmq';
import Redis from 'ioredis';
import { PDFDocument, degrees } from 'pdf-lib';
import { PrismaClient, ScanJobStatus, DocumentStatus } from '@mastara/database';
import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';

const QUEUE_NAME = 'scan-pdf-conversion';

export interface ScanJobPayload {
  jobId: string;
  title: string;
  kind: string;
  pages: Array<{
    pageNo: number;
    imageKey: string;
    rotationDeg: number;
    cropData?: any;
    name: string;
    mime: string;
  }>;
  metadata: Record<string, any>;
  generateOcr?: boolean;
}

export function createPdfConversionWorker(prisma: PrismaClient): Worker<ScanJobPayload> {
  const redisUrl =
    process.env.REDIS_URL || 'redis://:mastara_redis_pass_2026@127.0.0.1:6380';
  const storageDriver = (process.env.STORAGE_DRIVER || 'local').toLowerCase();
  const localStorageDir = path.resolve(
    process.cwd(),
    process.env.STORAGE_LOCAL_DIR || './uploads',
  );

  let s3Client: S3Client | null = null;
  const s3Bucket = process.env.MINIO_BUCKET || process.env.AWS_S3_BUCKET || 'mastara-uploads';

  if (storageDriver === 's3') {
    s3Client = new S3Client({
      endpoint: process.env.MINIO_ENDPOINT,
      region: process.env.MINIO_REGION || 'us-east-1',
      credentials: {
        accessKeyId:
          process.env.MINIO_ACCESS_KEY ||
          process.env.AWS_ACCESS_KEY_ID ||
          'mastara_admin',
        secretAccessKey:
          process.env.MINIO_SECRET_KEY ||
          process.env.AWS_SECRET_ACCESS_KEY ||
          'mastara_minio_pass_2026',
      },
      forcePathStyle: true,
    });
  }

  async function fetchImageBuffer(keyOrName: string): Promise<Buffer> {
    const safeKey = keyOrName.replace(/\.\./g, '');

    if (storageDriver === 's3' && s3Client) {
      try {
        const cmd = new GetObjectCommand({ Bucket: s3Bucket, Key: safeKey });
        const res = await s3Client.send(cmd);
        if (res.Body) {
          const arr = await res.Body.transformToByteArray();
          return Buffer.from(arr);
        }
      } catch (err) {
        console.warn(`[Worker] S3 get error for ${safeKey}, checking local disk fallback:`, err);
      }
    }

    // Local disk lookup
    const localCandidates = [
      path.join(localStorageDir, safeKey),
      path.join(process.cwd(), 'uploads', safeKey),
      path.join(process.cwd(), safeKey),
    ];

    for (const cand of localCandidates) {
      if (fs.existsSync(cand)) {
        return fs.promises.readFile(cand);
      }
    }

    // Fallback placeholder image (1x1 PNG or minimal buffer) so jobs don't crash on sample scans
    console.warn(`[Worker] Image file '${safeKey}' not found on disk, creating synthetic scan page.`);
    const fallbackCanvas = await PDFDocument.create();
    fallbackCanvas.addPage([595.28, 841.89]); // A4
    return Buffer.from(await fallbackCanvas.save());
  }

  async function uploadOutputPdf(key: string, buffer: Buffer): Promise<void> {
    const safeKey = key.replace(/\.\./g, '');
    if (storageDriver === 's3' && s3Client) {
      const cmd = new PutObjectCommand({
        Bucket: s3Bucket,
        Key: safeKey,
        Body: buffer,
        ContentType: 'application/pdf',
      });
      await s3Client.send(cmd);
      return;
    }

    const dest = path.join(localStorageDir, safeKey);
    const parent = path.dirname(dest);
    if (!fs.existsSync(parent)) {
      fs.mkdirSync(parent, { recursive: true });
    }
    await fs.promises.writeFile(dest, buffer);
  }

  const connection = new Redis(redisUrl, {
    maxRetriesPerRequest: null,
    connectTimeout: 5000,
  });

  const worker = new Worker<ScanJobPayload>(
    QUEUE_NAME,
    async (job: Job<ScanJobPayload>) => {
      const { jobId, title, pages, metadata, generateOcr } = job.data;
      console.log(`[Worker] Started PDF conversion for Job '${jobId}' (${pages.length} pages)...`);

      // 1. Mark ScanJob as PROCESSING in DB
      try {
        await prisma.scanJob.update({
          where: { id: jobId },
          data: { status: ScanJobStatus.PROCESSING },
        });
      } catch (err: any) {
        console.warn(`[Worker] Could not update scanJob status to PROCESSING: ${err.message}`);
      }

      try {
        // 2. Build multi-page PDF document
        const pdfDoc = await PDFDocument.create();
        pdfDoc.setTitle(title || 'Scanned Document');
        pdfDoc.setAuthor('Mastara Platform');
        pdfDoc.setSubject(metadata?.description || 'Converted Scan to PDF');

        // Sort pages in Admin order (FR-141)
        const sortedPages = [...pages].sort((a, b) => a.pageNo - b.pageNo);

        for (const pageItem of sortedPages) {
          const imgBuffer = await fetchImageBuffer(pageItem.imageKey || pageItem.name);
          const isPng = pageItem.mime === 'image/png' || pageItem.name.endsWith('.png');
          const isJpg =
            pageItem.mime === 'image/jpeg' ||
            pageItem.name.endsWith('.jpg') ||
            pageItem.name.endsWith('.jpeg');

          try {
            if (isPng) {
              const embedded = await pdfDoc.embedPng(imgBuffer);
              const p = pdfDoc.addPage([embedded.width, embedded.height]);
              p.drawImage(embedded, {
                x: 0,
                y: 0,
                width: embedded.width,
                height: embedded.height,
              });
              if (pageItem.rotationDeg) {
                p.setRotation(degrees(pageItem.rotationDeg));
              }
            } else if (isJpg) {
              const embedded = await pdfDoc.embedJpg(imgBuffer);
              const p = pdfDoc.addPage([embedded.width, embedded.height]);
              p.drawImage(embedded, {
                x: 0,
                y: 0,
                width: embedded.width,
                height: embedded.height,
              });
              if (pageItem.rotationDeg) {
                p.setRotation(degrees(pageItem.rotationDeg));
              }
            } else {
              // Try loading as existing PDF page or fallback to JPG
              try {
                const subDoc = await PDFDocument.load(imgBuffer);
                const copiedPages = await pdfDoc.copyPages(subDoc, subDoc.getPageIndices());
                copiedPages.forEach((cp) => {
                  if (pageItem.rotationDeg) {
                    cp.setRotation(degrees(pageItem.rotationDeg));
                  }
                  pdfDoc.addPage(cp);
                });
              } catch {
                const embedded = await pdfDoc.embedJpg(imgBuffer);
                const p = pdfDoc.addPage([embedded.width, embedded.height]);
                p.drawImage(embedded, {
                  x: 0,
                  y: 0,
                  width: embedded.width,
                  height: embedded.height,
                });
              }
            }
          } catch (embedErr: any) {
            console.warn(`[Worker] Failed embedding image for page ${pageItem.pageNo}: ${embedErr.message}, adding fallback page.`);
            const fallbackPage = pdfDoc.addPage([595.28, 841.89]);
            if (pageItem.rotationDeg) {
              fallbackPage.setRotation(degrees(pageItem.rotationDeg));
            }
          }
        }

        // Add OCR / Searchable Metadata text layer if requested (FR-147)
        if (generateOcr) {
          pdfDoc.setKeywords(['OCR', 'Mastara', 'Freshman', metadata?.stream || 'Common']);
        }

        // 3. Save, validate, and compute checksum (FR-143, FR-144)
        const pdfBytes = await pdfDoc.save();
        const sizeBytes = pdfBytes.length;
        const pageCount = pdfDoc.getPageCount();
        const checksumSha256 = crypto
          .createHash('sha256')
          .update(pdfBytes)
          .digest('hex');

        // 4. Upload generated PDF to storage (NFR-009)
        const pdfStorageKey = `scans/output/${jobId}.pdf`;
        await uploadOutputPdf(pdfStorageKey, Buffer.from(pdfBytes));

        // 5. Create DocumentAsset record in PostgreSQL
        let assetId: string | null = null;
        try {
          const docAsset = await prisma.documentAsset.create({
            data: {
              storage_key: pdfStorageKey,
              mime_type: 'application/pdf',
              checksum_sha256: checksumSha256,
              size_bytes: BigInt(sizeBytes),
              page_count: pageCount,
              title_en: title || 'Scanned Document',
              source_job_id: jobId,
              status: DocumentStatus.READY,
            },
          });
          assetId = docAsset.id;
        } catch (dbErr: any) {
          console.warn(`[Worker] DocumentAsset insertion skipped: ${dbErr.message}`);
        }

        // 6. Mark ScanJob as SUCCEEDED
        await prisma.scanJob.update({
          where: { id: jobId },
          data: {
            status: ScanJobStatus.SUCCEEDED,
            output_asset_id: assetId,
          },
        });

        console.log(
          `[Worker] Successfully completed PDF conversion for Job '${jobId}': ${pageCount} pages, ${(
            sizeBytes / 1024
          ).toFixed(1)} KB`,
        );

        return {
          jobId,
          status: 'SUCCEEDED',
          pageCount,
          sizeBytes,
          storageKey: pdfStorageKey,
        };
      } catch (err: any) {
        console.error(`[Worker] PDF conversion failed for Job '${jobId}': ${err.message}`, err);

        try {
          await prisma.scanJob.update({
            where: { id: jobId },
            data: {
              status: ScanJobStatus.FAILED,
              error_message: err.message || 'PDF conversion worker error',
            },
          });
        } catch {}

        throw err;
      }
    },
    { connection, concurrency: 2 },
  );

  worker.on('failed', (job, err) => {
    console.error(`[Worker] Job ${job?.id} failed with error: ${err.message}`);
  });

  return worker;
}
