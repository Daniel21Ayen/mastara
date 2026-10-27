// apps/api/src/infrastructure/redis/redis.service.ts
import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis | null = null;
  private isConnected = false;
  // Local in-memory fallback cache if Redis is temporarily unreachable
  private readonly memoryFallback = new Map<string, { value: string; expiresAt?: number }>();

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  onModuleInit() {
    const redisUrl = this.config.get<string>('REDIS_URL');
    if (!redisUrl) {
      this.logger.warn('REDIS_URL is not set. Using the in-memory fallback cache (single instance only).');
      return;
    }

    try {
      this.client = new Redis(redisUrl, {
        maxRetriesPerRequest: 2,
        retryStrategy: (times) => {
          if (times > 5) return null; // Stop reconnecting after 5 attempts
          return Math.min(times * 200, 2000);
        },
      });

      this.client.on('connect', () => {
        this.isConnected = true;
        this.logger.log('Redis client connected successfully');
      });

      this.client.on('error', (err) => {
        this.isConnected = false;
        this.logger.warn(`Redis connection error: ${err.message}. Using fallback cache.`);
      });
    } catch (err: any) {
      this.logger.warn(`Failed to initialize Redis client: ${err.message}. Using memory fallback.`);
    }
  }

  async onModuleDestroy() {
    if (this.client) {
      try {
        await this.client.quit();
      } catch {
        // ignore
      }
    }
  }

  async isHealthy(): Promise<boolean> {
    if (!this.client || !this.isConnected) return false;
    try {
      const pong = await this.client.ping();
      return pong === 'PONG';
    } catch {
      return false;
    }
  }

  async get(key: string): Promise<string | null> {
    if (this.isConnected && this.client) {
      try {
        return await this.client.get(key);
      } catch (err: any) {
        this.logger.warn(`Redis GET failed for ${key}: ${err.message}`);
      }
    }
    const mem = this.memoryFallback.get(key);
    if (!mem) return null;
    if (mem.expiresAt && Date.now() > mem.expiresAt) {
      this.memoryFallback.delete(key);
      return null;
    }
    return mem.value;
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (this.isConnected && this.client) {
      try {
        if (ttlSeconds && ttlSeconds > 0) {
          await this.client.set(key, value, 'EX', ttlSeconds);
        } else {
          await this.client.set(key, value);
        }
        return;
      } catch (err: any) {
        this.logger.warn(`Redis SET failed for ${key}: ${err.message}`);
      }
    }
    this.memoryFallback.set(key, {
      value,
      expiresAt: ttlSeconds ? Date.now() + ttlSeconds * 1000 : undefined,
    });
  }

  async del(key: string | string[]): Promise<void> {
    const keys = Array.isArray(key) ? key : [key];
    if (this.isConnected && this.client) {
      try {
        if (keys.length > 0) {
          await this.client.del(...keys);
        }
      } catch (err: any) {
        this.logger.warn(`Redis DEL failed: ${err.message}`);
      }
    }
    for (const k of keys) {
      this.memoryFallback.delete(k);
    }
  }

  async delPattern(pattern: string): Promise<void> {
    if (this.isConnected && this.client) {
      try {
        const keys = await this.client.keys(pattern);
        if (keys.length > 0) {
          await this.client.del(...keys);
        }
      } catch (err: any) {
        this.logger.warn(`Redis DEL pattern ${pattern} failed: ${err.message}`);
      }
    }
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    for (const k of this.memoryFallback.keys()) {
      if (regex.test(k)) this.memoryFallback.delete(k);
    }
  }

  // ---- Catalog Snapshot Versioning & Invalidation ----

  async getCatalogVersion(): Promise<string> {
    const v = await this.get('catalog:version');
    if (v) return v;
    const initial = `v-${Date.now()}`;
    await this.set('catalog:version', initial);
    return initial;
  }

  async bumpCatalogVersion(): Promise<string> {
    const nextVersion = `v-${Date.now()}`;
    await this.set('catalog:version', nextVersion);
    await this.delPattern('catalog:snapshot:*');
    this.logger.log(`Catalog cache invalidated. New catalog version: ${nextVersion}`);
    return nextVersion;
  }

  async invalidateCatalogCache(): Promise<string> {
    return this.bumpCatalogVersion();
  }

  async recordTombstone(entityId: string, kind: string): Promise<void> {
    try {
      await this.prisma.catalogTombstone.create({
        data: {
          entity_id: entityId,
          kind,
        },
      });
    } catch (err: any) {
      this.logger.error(`Failed to record tombstone for ${kind}:${entityId}: ${err.message}`);
    }
    await this.invalidateCatalogCache();
  }

  async getCachedSnapshot(cacheKey: string): Promise<string | null> {
    return this.get(`catalog:snapshot:${cacheKey}`);
  }

  async setCachedSnapshot(cacheKey: string, payload: string, ttlSeconds = 3600): Promise<void> {
    await this.set(`catalog:snapshot:${cacheKey}`, payload, ttlSeconds);
  }
}
