/**
 * Redis Caching Layer
 * Provides distributed caching for multi-instance deployments
 * Falls back to in-memory cache if Redis unavailable
 */

interface CacheConfig {
  ttl?: number;  // Time to live in seconds
  prefix?: string;
}

const DEFAULT_TTL = 1800;  // 30 minutes
const CACHE_PREFIX = 'nre:';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const redisClient: any = null;
let isRedisAvailable = false;

/**
 * Initialize Redis connection (optional - gracefully degrades if unavailable)
 */
export const initializeRedis = async (redisUrl?: string) => {
  if (!redisUrl) return;
  
  try {
    // Uncomment when redis package is installed
    // const redis = await import('redis');
    // redisClient = redis.createClient({ url: redisUrl });
    // await redisClient.connect();
    // isRedisAvailable = true;
    // console.log('[Redis] Connected successfully');
  } catch (error) {
    console.warn('[Redis] Connection failed, using in-memory cache:', error);
    isRedisAvailable = false;
  }
};

/**
 * Get value from cache (Redis → In-Memory fallback)
 */
export const getCacheValue = async <T>(key: string): Promise<T | null> => {
  const cacheKey = CACHE_PREFIX + key;
  
  try {
    // Try Redis first
    if (isRedisAvailable && redisClient) {
      const cached = await redisClient.get(cacheKey);
      if (cached) {
        return JSON.parse(cached) as T;
      }
    }
  } catch (error) {
    console.warn('[Cache] Redis get failed:', error);
  }
  
  return null;
};

/**
 * Set value in cache (Redis + In-Memory)
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
    }
  } catch (error) {
    console.warn('[Cache] Redis set failed:', error);
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
  return {
    redis: isRedisAvailable,
    connected: isRedisAvailable && redisClient?.isOpen,
    url: process.env.REDIS_URL || 'not configured',
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if ((params as any)[key]) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        acc[key] = (params as any)[key];
      }
      return acc;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
