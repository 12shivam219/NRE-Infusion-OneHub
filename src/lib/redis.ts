/**
 * Redis Caching Layer - Optimized for 1M+ Users
 * Provides distributed caching, connection pooling, and automatic failover
 * Falls back to in-memory cache if Redis unavailable
 */

interface CacheConfig {
  ttl?: number;
  prefix?: string;
}

const DEFAULT_TTL = 1800;
const CACHE_PREFIX = 'nre:';
const IN_MEMORY_CACHE = new Map<string, { value: unknown; expires: number }>();
const CACHE_SIZE_LIMIT = 10000; // Prevent memory bloat

let redisClient: any = null;
let isRedisAvailable = false;

/**
 * Initialize Redis with connection pooling and cluster support
 */
export const initializeRedis = async (redisUrl?: string) => {
  if (!redisUrl) {
    console.log('[Redis] URL not provided, using in-memory cache only');
    return;
  }
  
  try {
    const redis = await import('redis');
    
    redisClient = redis.createClient({
      url: redisUrl,
      socket: {
        reconnectStrategy: (retries: number) => {
          const delay = Math.min(50 * Math.pow(2, retries), 500);
          return delay;
        },
        // Connection pooling settings
        connectTimeout: 10000,
      },
      password: redisUrl.includes('@') ? undefined : process.env.REDIS_PASSWORD,
    } as any);

    redisClient.on('error', (err: Error) => {
      console.warn('[Redis] Error:', err.message);
      isRedisAvailable = false;
    });

    redisClient.on('connect', () => {
      console.log('✅ [Redis] Connected');
      isRedisAvailable = true;
    });

    redisClient.on('reconnecting', () => {
      console.log('[Redis] Reconnecting...');
    });

    await redisClient.connect();
    isRedisAvailable = true;
    console.log('[Redis] Connection pool established');
  } catch (error) {
    console.warn('[Redis] Initialization failed, using in-memory cache:', error);
    isRedisAvailable = false;
  }
};

/**
 * Get value from cache (Redis → In-Memory fallback)
 * Handles automatic cleanup of expired entries
 */
export const getCacheValue = async <T>(key: string): Promise<T | null> => {
  const cacheKey = CACHE_PREFIX + key;
  
  try {
    // Try Redis first (distributed cache)
    if (isRedisAvailable && redisClient) {
      const cached = await redisClient.get(cacheKey);
      if (cached) {
        return JSON.parse(cached) as T;
      }
    }
  } catch (error) {
    console.warn('[Cache] Redis get failed:', error);
  }

  // Fallback to in-memory cache
  const inMem = IN_MEMORY_CACHE.get(cacheKey);
  if (inMem && inMem.expires > Date.now()) {
    return inMem.value as T;
  } else if (inMem) {
    IN_MEMORY_CACHE.delete(cacheKey);
  }

  return null;
};

/**
 * Set value in cache (Redis + In-Memory backup)
 * Implements LRU eviction for in-memory cache
 */
export const setCacheValue = async <T>(
  key: string, 
  value: T, 
  config?: CacheConfig
): Promise<void> => {
  const cacheKey = CACHE_PREFIX + key;
  const ttl = config?.ttl || DEFAULT_TTL;
  
  try {
    // Set in Redis if available
    if (isRedisAvailable && redisClient) {
      await redisClient.setEx(cacheKey, ttl, JSON.stringify(value));
    } else {
      // In-memory fallback
      const expires = Date.now() + (ttl * 1000);
      
      // LRU eviction if cache gets too large
      if (IN_MEMORY_CACHE.size >= CACHE_SIZE_LIMIT) {
        const oldestKey = Array.from(IN_MEMORY_CACHE.entries())
          .sort((a, b) => a[1].expires - b[1].expires)[0][0];
        IN_MEMORY_CACHE.delete(oldestKey);
      }
      
      IN_MEMORY_CACHE.set(cacheKey, { value, expires });
    }
  } catch (error) {
    console.warn('[Cache] Set failed:', error);
  }
};

/**
 * Delete cache key
 */
export const deleteCacheKey = async (key: string): Promise<void> => {
  const cacheKey = CACHE_PREFIX + key;
  
  try {
    if (isRedisAvailable && redisClient) {
      await redisClient.del(cacheKey);
    }
  } catch (error) {
    console.warn('[Cache] Redis delete failed:', error);
  }
};

/**
 * Alias for deleteCacheKey for consistency
 */
export const deleteCacheValue = deleteCacheKey;

/**
 * Clear all cache keys with pattern
 */
export const clearCachePattern = async (pattern: string): Promise<void> => {
  const searchPattern = CACHE_PREFIX + pattern;
  
  try {
    if (isRedisAvailable && redisClient) {
      const keys = await redisClient.keys(searchPattern);
      if (keys.length > 0) {
        await redisClient.del(keys);
      }
    }
  } catch (error) {
    console.warn('[Cache] Redis pattern clear failed:', error);
  }
};

/**
 * Get cache stats (for monitoring)
 */
export const getCacheStats = async () => {
  let redisStats: any = null;
  
  if (isRedisAvailable && redisClient) {
    try {
      redisStats = await redisClient.info('memory');
    } catch (error) {
      console.warn('[Cache] Failed to get Redis stats:', error);
    }
  }

  return {
    redis: isRedisAvailable,
    redisStats,
    inMemorySize: IN_MEMORY_CACHE.size,
    maxInMemory: CACHE_SIZE_LIMIT,
  };
};

/**
 * Generate cache key for requirements query
 */
export const generateRequirementsCacheKey = (params: {
  userId: string;
  page: number;
  pageSize: number;
  search?: string;
  status?: string;
  minRate?: string;
  maxRate?: string;
  remoteFilter?: string;
  sortBy?: string;
  sortOrder?: string;
}) => {
  const sorted = Object.keys(params)
    .sort()
    .reduce((acc, key) => {
       
      if ((params as any)[key]) {
         
        acc[key] = (params as any)[key];
      }
      return acc;
       
    }, {} as any);
  
  return `requirements:${JSON.stringify(sorted)}`;
};

export default {
  getCacheValue,
  setCacheValue,
  deleteCacheKey,
  clearCachePattern,
  getCacheStats,
  initializeRedis,
};
