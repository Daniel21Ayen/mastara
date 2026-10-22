// apps/worker/src/main.ts
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load root and worker environment variables
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config();

import { PrismaClient } from '@mastara/database';
import { createPdfConversionWorker } from './jobs/pdf-conversion.job';

async function bootstrap() {
  console.log('─────────────────────────────────────────────────────────────');
  console.log('  Mastara Background Worker Engine');
  console.log('─────────────────────────────────────────────────────────────');

  const prisma = new PrismaClient();
  await prisma.$connect();
  console.log('  [Worker] Connected to PostgreSQL Database');

  const pdfWorker = createPdfConversionWorker(prisma);
  console.log('  [Worker] BullMQ PDF Conversion Worker active on Redis');

  const shutdown = async (signal: string) => {
    console.log(`\n  [Worker] Received ${signal}, shutting down gracefully...`);
    await pdfWorker.close();
    await prisma.$disconnect();
    process.exit(0);
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

bootstrap().catch((err) => {
  console.error('[Worker] Fatal startup error:', err);
  process.exit(1);
});
