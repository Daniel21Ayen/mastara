// apps/api/src/infrastructure/queue/queue.service.ts
import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
import Redis from 'ioredis';

export const SCAN_PDF_QUEUE_NAME = 'scan-pdf-conversion';

export interface ScanPdfPageJobInput {
  pageNo: number;
  imageKey: string;
  rotationDeg: number;
  cropData?: {
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    mime?: string;
    sizeBytes?: number;
  } | null;
  name: string;
  mime: string;
}

export interface ScanPdfJobData {
  jobId: string;
  title: string;
  kind: string;
  pages: ScanPdfPageJobInput[];
  metadata: Record<string, any>;
  generateOcr?: boolean;
}

@Injectable()
export class QueueService implements OnModuleDestroy {
  private readonly logger = new Logger(QueueService.name);
  private scanPdfQueue?: Queue;
  private redisClient?: Redis;
  private isConnected = false;

  constructor(private readonly config: ConfigService) {
    this.initQueue();
  }

  private initQueue() {
    try {
      const redisUrl = this.config.get<string>(
        'REDIS_URL',
        'redis://:mastara_redis_pass_2026@127.0.0.1:6380',
      );

      this.redisClient = new Redis(redisUrl, {
        maxRetriesPerRequest: null,
        lazyConnect: true,
        connectTimeout: 4000,
      });

      this.redisClient.on('connect', () => {
        this.isConnected = true;
        this.logger.log(`BullMQ connected to Redis for queue '${SCAN_PDF_QUEUE_NAME}'`);
      });

      this.redisClient.on('error', (err) => {
        this.isConnected = false;
        this.logger.warn(`Redis connection warning in QueueService: ${err.message}`);
      });

      this.scanPdfQueue = new Queue(SCAN_PDF_QUEUE_NAME, {
        connection: this.redisClient,
        defaultJobOptions: {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
          removeOnComplete: true,
          removeOnFail: false,
        },
      });
    } catch (err: any) {
      this.logger.error(`Failed to initialize BullMQ queue: ${err.message}`);
    }
  }

  async addScanPdfJob(data: ScanPdfJobData): Promise<string> {
    if (!this.scanPdfQueue) {
      throw new Error('BullMQ Scan PDF queue is not initialized');
    }

    const job = await this.scanPdfQueue.add('convert-images-to-pdf', data, {
      jobId: data.jobId,
    });

    this.logger.log(
      `Dispatched scan job '${data.jobId}' (${data.pages.length} pages) to BullMQ queue '${SCAN_PDF_QUEUE_NAME}'`,
    );

    return job.id ?? data.jobId;
  }

  async onModuleDestroy() {
    if (this.scanPdfQueue) {
      await this.scanPdfQueue.close();
    }
    if (this.redisClient) {
      this.redisClient.disconnect();
    }
  }
}
