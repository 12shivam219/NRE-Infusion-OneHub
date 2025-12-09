/**
 * IndexedDB Offline Database
 * Provides client-side caching for offline support and faster data access
 * Uses Dexie.js for simplified IndexedDB operations
 * 
 * WHY: 
 * - Users can view cached data when offline
 * - Reduces API calls by serving from local cache first
 * - Significantly faster than network requests (typically <10ms vs 100-200ms)
 * - Syncs automatically when connection restored
 */

import Dexie, { Table } from 'dexie';

export interface CachedRequirement {
  id: string;
  user_id: string;
  title: string;
  company?: string;
  status: string;
  created_at: string;
  updated_at: string;
  [key: string]: unknown;
}

export interface CachedConsultant {
  id: string;
  user_id: string;
  name: string;
  email?: string;
  status: string;
  created_at: string;
  updated_at: string;
  [key: string]: unknown;
}

export interface CachedInterview {
  id: string;
  requirement_id: string;
  scheduled_date: string;
  status: string;
  created_at: string;
  updated_at: string;
  [key: string]: unknown;
}

export interface CacheMetadata {
  key: string;
  lastUpdated: number;
  expiresAt: number;
  count?: number;
}

class OfflineDatabase extends Dexie {
  requirements!: Table<CachedRequirement>;
  consultants!: Table<CachedConsultant>;
  interviews!: Table<CachedInterview>;
  cacheMetadata!: Table<CacheMetadata>;

  constructor() {
    super('NREOfflineDB');
    this.version(1).stores({
      requirements: '++id, user_id, status, created_at',
      consultants: '++id, user_id, status, created_at',
      interviews: '++id, requirement_id, scheduled_date, status',
      cacheMetadata: 'key',
    });
  }
}

export const db = new OfflineDatabase();

// Cache TTL in milliseconds
const CACHE_DURATIONS = {
  REQUIREMENTS: 10 * 60 * 1000, // 10 minutes
  CONSULTANTS: 10 * 60 * 1000,  // 10 minutes
  INTERVIEWS: 5 * 60 * 1000,    // 5 minutes
  USERS: 60 * 60 * 1000,        // 1 hour
} as const;

/**
 * Cache requirements data locally
 * Enables offline access and reduces API calls
 */
export async function cacheRequirements(
  requirements: CachedRequirement[],
  userId: string
): Promise<void> {
  try {
    // Clear old data for this user
    await db.requirements.where('user_id').equals(userId).delete();

    // Add new data
    await db.requirements.bulkAdd(requirements);

    // Update metadata
    await db.cacheMetadata.put({
      key: `requirements_${userId}`,
      lastUpdated: Date.now(),
      expiresAt: Date.now() + CACHE_DURATIONS.REQUIREMENTS,
      count: requirements.length,
    });
  } catch (error) {
    console.error('Failed to cache requirements:', error);
  }
}

/**
 * Get cached requirements for offline use
 * Returns null if cache expired
 */
export async function getCachedRequirements(userId: string): Promise<CachedRequirement[] | null> {
  try {
    const metadata = await db.cacheMetadata.get(`requirements_${userId}`);

    // Check if cache is still valid
    if (!metadata || metadata.expiresAt < Date.now()) {
      return null;
    }

    return await db.requirements.where('user_id').equals(userId).toArray();
  } catch (error) {
    console.error('Failed to get cached requirements:', error);
    return null;
  }
}

/**
 * Cache consultants data locally
 */
export async function cacheConsultants(
  consultants: CachedConsultant[],
  userId: string
): Promise<void> {
  try {
    await db.consultants.where('user_id').equals(userId).delete();
    await db.consultants.bulkAdd(consultants);

    await db.cacheMetadata.put({
      key: `consultants_${userId}`,
      lastUpdated: Date.now(),
      expiresAt: Date.now() + CACHE_DURATIONS.CONSULTANTS,
      count: consultants.length,
    });
  } catch (error) {
    console.error('Failed to cache consultants:', error);
  }
}

/**
 * Get cached consultants for offline use
 */
export async function getCachedConsultants(userId: string): Promise<CachedConsultant[] | null> {
  try {
    const metadata = await db.cacheMetadata.get(`consultants_${userId}`);

    if (!metadata || metadata.expiresAt < Date.now()) {
      return null;
    }

    return await db.consultants.where('user_id').equals(userId).toArray();
  } catch (error) {
    console.error('Failed to get cached consultants:', error);
    return null;
  }
}

/**
 * Cache interviews data locally
 */
export async function cacheInterviews(
  interviews: CachedInterview[],
  userId: string
): Promise<void> {
  try {
    // For interviews, we need to track by user differently
    // Store in metadata which interviews belong to which user
    const existingInterviews = await db.interviews.toArray();
    const userInterviewIds = new Set(interviews.map(i => i.id));
    const otherUserInterviews = existingInterviews.filter(
      i => !userInterviewIds.has(i.id)
    );

    await db.interviews.clear();
    await db.interviews.bulkAdd([...interviews, ...otherUserInterviews]);

    await db.cacheMetadata.put({
      key: `interviews_${userId}`,
      lastUpdated: Date.now(),
      expiresAt: Date.now() + CACHE_DURATIONS.INTERVIEWS,
      count: interviews.length,
    });
  } catch (error) {
    console.error('Failed to cache interviews:', error);
  }
}

/**
 * Get cached interviews for offline use
 */
export async function getCachedInterviews(): Promise<CachedInterview[] | null> {
  try {
    return await db.interviews.toArray();
  } catch (error) {
    console.error('Failed to get cached interviews:', error);
    return null;
  }
}

/**
 * Clear all offline cache
 * Call when user logs out
 */
export async function clearOfflineCache(): Promise<void> {
  try {
    await db.requirements.clear();
    await db.consultants.clear();
    await db.interviews.clear();
    await db.cacheMetadata.clear();
  } catch (error) {
    console.error('Failed to clear offline cache:', error);
  }
}

/**
 * Get cache statistics for debugging
 */
export async function getCacheStats(): Promise<{
  requirements: number;
  consultants: number;
  interviews: number;
  lastUpdated: Record<string, number>;
}> {
  try {
    const [reqCount, conCount, intCount, metadata] = await Promise.all([
      db.requirements.count(),
      db.consultants.count(),
      db.interviews.count(),
      db.cacheMetadata.toArray(),
    ]);

    const lastUpdated: Record<string, number> = {};
    metadata.forEach(m => {
      lastUpdated[m.key] = m.lastUpdated;
    });

    return {
      requirements: reqCount,
      consultants: conCount,
      interviews: intCount,
      lastUpdated,
    };
  } catch (error) {
    console.error('Failed to get cache stats:', error);
    return {
      requirements: 0,
      consultants: 0,
      interviews: 0,
      lastUpdated: {},
    };
  }
}

/**
 * Check if device is online
 */
export function isOnline(): boolean {
  return navigator.onLine;
}
