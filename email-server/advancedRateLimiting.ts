/**
 * Advanced Rate Limiting for 1M+ Users
 * Token bucket algorithm with distributed Redis support
 */

import { createClient } from 'redis';
import type { Request, Response, NextFunction } from 'express-serve-static-core';

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number; // in milliseconds
  message?: string;
  statusCode?: number;
  keyGenerator?: (req: Request) => string;
  skip?: (req: Request) => boolean;
}

interface TokenBucket {
  tokens: number;
  lastRefill: number;
}

/**
 * ⚡ Distributed Rate Limiter using Token Bucket Algorithm
 * Solves thundering herd problem with Redis-backed state
 */
export class DistributedRateLimiter {
  private redis: ReturnType<typeof createClient> | null = null;
  private config: RateLimitConfig;
  private localBuckets: Map<string, TokenBucket> = new Map();
  private readonly REFILL_RATE = 0.1; // tokens per millisecond

  constructor(config: RateLimitConfig) {
    this.config = {
      statusCode: 429,
      message: 'Too many requests',
      ...config,
    };

    // Initialize Redis connection if available
    this.initializeRedis();
  }

  private async initializeRedis() {
    try {
      this.redis = createClient({
        socket: {
          host: process.env.REDIS_HOST || 'localhost',
          port: parseInt(process.env.REDIS_PORT || '6379'),
        },
      });
      await this.redis.connect();
    } catch {
      console.warn('[Rate Limiting] Redis unavailable, using local fallback');
    }
  }

  /**
   * Token Bucket Algorithm
   * - Tokens refill at constant rate
   * - Request takes 1 token
   * - Burst capacity: maxRequests tokens
   */
  private async refillBucket(key: string): Promise<TokenBucket> {
    const now = Date.now();
    let bucket = this.localBuckets.get(key);

    if (!bucket) {
      bucket = { tokens: this.config.maxRequests, lastRefill: now };
    } else {
      const timePassed = now - bucket.lastRefill;
      const refill = timePassed * this.REFILL_RATE;
      bucket.tokens = Math.min(this.config.maxRequests, bucket.tokens + refill);
      bucket.lastRefill = now;
    }

    this.localBuckets.set(key, bucket);
    return bucket;
  }

  private getClientIp(req: Request): string {
    return (
      (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() ||
      req.socket.remoteAddress ||
      'unknown'
    );
  }

  async checkLimit(key: string): Promise<{ allowed: boolean; remaining: number }> {
    if (this.redis) {
      // Distributed rate limiting via Lua script
      const luaScript = `
        local key = KEYS[1]
        local maxRequests = tonumber(ARGV[1])
        local windowMs = tonumber(ARGV[2])
        local now = tonumber(ARGV[3])
        
        local bucket = redis.call('GET', key)
        if not bucket then
          redis.call('SET', key, maxRequests - 1, 'PX', windowMs)
          return {1, maxRequests - 1}
        end
        
        bucket = tonumber(bucket)
        if bucket > 0 then
          redis.call('DECRBY', key, 1)
          return {1, bucket - 1}
        else
          return {0, 0}
        end
      `;

      try {
        const result = await (this.redis as any).eval(luaScript, {
          keys: [key],
          arguments: [
            String(this.config.maxRequests),
            String(this.config.windowMs),
            String(Date.now()),
          ],
        });
        return { allowed: result[0] === 1, remaining: result[1] };
      } catch (error) {
        console.error('[Rate Limiting] Redis error:', error);
        // Fallback to local bucket
      }
    }

    const bucket = await this.refillBucket(key);
    if (bucket.tokens >= 1) {
      bucket.tokens -= 1;
      return { allowed: true, remaining: Math.floor(bucket.tokens) };
    }
    return { allowed: false, remaining: 0 };
  }

  middleware() {
    return async (req: Request, res: Response, next: NextFunction) => {
      if (this.config.skip && this.config.skip(req)) {
        return next();
      }

      const key = this.config.keyGenerator
        ? this.config.keyGenerator(req)
        : this.getClientIp(req);

      const { allowed, remaining } = await this.checkLimit(key);

      res.setHeader('X-RateLimit-Remaining', remaining.toString());
      res.setHeader('X-RateLimit-Limit', this.config.maxRequests.toString());

      if (!allowed) {
        return res.status(this.config.statusCode || 429).json({
          error: this.config.message || 'Too many requests',
          retryAfter: Math.ceil(this.config.windowMs / 1000),
        });
      }

      next();
    };
  }
}

// Pre-configured rate limiters for common use cases
export const apiRateLimiter = new DistributedRateLimiter({
  maxRequests: 100,
  windowMs: 1000, // 1 second
  message: 'API rate limit exceeded (100 req/s)',
  keyGenerator: (req) => ((req as any).user?.id) || `ip:${req.socket.remoteAddress}`,
});

export const emailRateLimiter = new DistributedRateLimiter({
  maxRequests: 20,
  windowMs: 1000, // 1 second
  message: 'Email rate limit exceeded (20 req/s)',
  keyGenerator: (req) => `email:${req.socket.remoteAddress}`,
});

export const globalRateLimiter = new DistributedRateLimiter({
  maxRequests: 1000,
  windowMs: 1000, // 1 second
  message: 'Global rate limit exceeded',
  keyGenerator: () => 'global',
});
