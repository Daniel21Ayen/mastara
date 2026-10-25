// apps/worker/src/main.ts
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load root and worker environment variables
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config();

import * as http from 'http';
import Redis from 'ioredis';
import { PrismaClient } from '@mastara/database';
import { createPdfConversionWorker } from './jobs/pdf-conversion.job';

async function bootstrap() {
  console.log('─────────────────────────────────────────────────────────────');
  console.log('  Mastara Background Worker Engine');
  console.log('─────────────────────────────────────────────────────────────');

  const prisma = new PrismaClient();
  await prisma.$connect();
  console.log('  [Worker] Connected to PostgreSQL Database');

  const redisUrl =
    process.env.REDIS_URL || 'redis://:mastara_redis_pass_2026@127.0.0.1:6380';
  const redis = new Redis(redisUrl, {
    maxRetriesPerRequest: 2,
    lazyConnect: true,
  });
  await redis.connect().catch((err) => {
    console.warn('  [Worker] Redis connection warning:', err.message);
  });

  const pdfWorker = createPdfConversionWorker(prisma);
  console.log('  [Worker] BullMQ PDF Conversion Worker active on Redis');

  // Lightweight HTTP Health & Readiness Server
  const healthPort = Number(process.env.WORKER_HEALTH_PORT) || 4005;
  const server = http.createServer(async (req, res) => {
    const url = req.url || '/';

    if (url === '/health' || url === '/health/live') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          status: 'ok',
          type: 'liveness',
          worker: 'mastara-worker',
          timestamp: new Date().toISOString(),
          uptime: process.uptime(),
        }),
      );
      return;
    }

    if (url === '/health/ready') {
      const [dbHealthy, redisHealthy] = await Promise.all([
        prisma
          .$queryRaw`SELECT 1`
          .then(() => true)
          .catch(() => false),
        redis
          .ping()
          .then((p) => p === 'PONG')
          .catch(() => false),
      ]);

      const isReady = dbHealthy && redisHealthy;
      res.writeHead(isReady ? 200 : 503, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          status: isReady ? 'ok' : 'down',
          type: 'readiness',
          worker: 'mastara-worker',
          timestamp: new Date().toISOString(),
          services: {
            database: dbHealthy ? 'connected' : 'disconnected',
            redis: redisHealthy ? 'connected' : 'disconnected',
          },
          uptime: process.uptime(),
        }),
      );
      return;
    }

    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not Found' }));
  });

  server.listen(healthPort, () => {
    console.log(`  [Worker] Health & readiness check listening on port ${healthPort}`);
  });

  const shutdown = async (signal: string) => {
    console.log(`\n  [Worker] Received ${signal}, shutting down gracefully...`);
    server.close();
    await pdfWorker.close();
    await redis.quit().catch(() => undefined);
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
