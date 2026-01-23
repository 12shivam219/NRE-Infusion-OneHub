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
import { supabase } from './supabase';

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

// Feature 1: Offline Sync Queue
export interface SyncQueueItem {
  id: string;
  operation: 'CREATE' | 'UPDATE' | 'DELETE';
  entityType: 'requirement' | 'consultant' | 'interview' | 'document' | 'email';
  entityId: string;
  payload: Record<string, unknown>;
  timestamp: number;
  retries: number;
  lastError?: string;
  status: 'pending' | 'syncing' | 'failed';
  nextAttempt?: number;
}

// Feature 3: Expanded Cache Coverage
export interface CachedDocument {
  id: string;
  user_id: string;
  name: string;
  content?: string;
  type: string;
  created_at: string;
  updated_at: string;
  [key: string]: unknown;
}

export interface CachedEmail {
  id: string;
  requirement_id: string;
  subject: string;
  body?: string;
  from: string;
  to: string;
  sent_date: string;
  created_at: string;
  [key: string]: unknown;
}

// Feature 8: Selective Sync Hook
export interface CachePreferences {
  key: string; // Required primary key for Dexie
  cacheRequirements: boolean;
  cacheConsultants: boolean;
  cacheInterviews: boolean;
  cacheDocuments: boolean;
  cacheEmails: boolean;
  maxCacheSize: number; // MB
  syncOnWiFiOnly: boolean;
}

// Feature 6: Sync Progress Tracking
export interface SyncStatus {
  isSyncing: boolean;
  itemsRemaining: number;
  lastSyncTime: number | null;
  failedItems: number;
  progress: number; // 0-100
  totalItems: number;
}

// Feature 7: Conflict Resolution
export interface ConflictRecord {
  id: string;
  entityType: string;
  entityId: string;
  strategy: 'local' | 'remote' | 'merge' | 'pending';
  timestamp: number;
  localVersion: Record<string, unknown>;
  remoteVersion: Record<string, unknown>;
  userResolved?: boolean;
  resolvedAt?: number;
  selectedVersion?: 'local' | 'remote';
}

// Feature 10: Cache Analytics
export interface CacheAnalytics {
  key: string; // Required primary key for Dexie
  offlineTime: number; // minutes
  itemsCreatedOffline: number;
  itemsUpdatedOffline: number;
  itemsDeletedOffline: number;
  syncSuccessRate: number; // 0-100
  averageSyncTime: number; // ms
  totalSyncEvents: number;
}

class OfflineDatabase extends Dexie {
  requirements!: Table<CachedRequirement>;
  consultants!: Table<CachedConsultant>;
  interviews!: Table<CachedInterview>;
  cacheMetadata!: Table<CacheMetadata>;
  syncQueue!: Table<SyncQueueItem>;
  documents!: Table<CachedDocument>;
  emails!: Table<CachedEmail>;
  cachePreferences!: Table<CachePreferences>;
  conflicts!: Table<ConflictRecord>;
  analytics!: Table<CacheAnalytics>;

  constructor() {
    super('NREOfflineDB');
    this.version(2).stores({
      // Use server-provided string `id` as primary key (UUID) to avoid numeric auto-increment mismatches
      requirements: 'id, user_id, status, created_at',
      consultants: 'id, user_id, status, created_at',
      interviews: 'id, requirement_id, scheduled_date, status',
      cacheMetadata: 'key',
      // syncQueue uses string ids generated in addToSyncQueue
      syncQueue: 'id, entityType, entityId, status, timestamp',
      documents: 'id, user_id, created_at',
      emails: 'id, requirement_id, sent_date',
      cachePreferences: 'key',
      conflicts: 'id, entityType, entityId',
      analytics: 'key',
    });
  }
}

// ⚡ PERFORMANCE: Lazy-load Dexie database to avoid blocking app startup
// The database is only initialized when first accessed, not at module load time
let dbInstance: OfflineDatabase | null = null;

function getDB(): OfflineDatabase {
  if (!dbInstance) {
    dbInstance = new OfflineDatabase();
  }
  return dbInstance;
}

export const db = new Proxy({} as OfflineDatabase, {
  get(_, prop) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (getDB() as any)[prop];
  },
});

// Cache TTL in milliseconds
const CACHE_DURATIONS = {
  REQUIREMENTS: 10 * 60 * 1000, // 10 minutes
  CONSULTANTS: 10 * 60 * 1000,  // 10 minutes
  INTERVIEWS: 5 * 60 * 1000,    // 5 minutes
  USERS: 60 * 60 * 1000,        // 1 hour
} as const;

 const dispatchSyncQueueChanged = () => {
   if (typeof window === 'undefined') return;
   window.dispatchEvent(new CustomEvent('sync-queue-changed'));
 };

/**
 * Cache requirements data locally
 * Enables offline access and reduces API calls
 */
export async function cacheRequirements(
  requirements: CachedRequirement[],
  userId: string
): Promise<void> {
  try {
    // Upsert new/updated requirements in chunks and remove deleted ones (incremental sync)
    const CHUNK = 500;
    for (let i = 0; i < requirements.length; i += CHUNK) {
      await db.requirements.bulkPut(requirements.slice(i, i + CHUNK));
    }

    // Update metadata
    const count = await db.requirements.where('user_id').equals(userId).count();
    await db.cacheMetadata.put({
      key: `requirements_${userId}`,
      lastUpdated: Date.now(),
      expiresAt: Date.now() + CACHE_DURATIONS.REQUIREMENTS,
      count,
    });
  } catch (error) {
    console.error('Failed to cache requirements:', error);
  }
}

export async function removeCachedRequirement(userId: string, requirementId: string): Promise<void> {
  try {
    await db.requirements.delete(requirementId);

    const metadataKey = `requirements_${userId}`;
    const metadata = await db.cacheMetadata.get(metadataKey);
    if (metadata) {
      const count = await db.requirements.where('user_id').equals(userId).count();
      await db.cacheMetadata.put({
        ...metadata,
        count,
      });
    }
  } catch (error) {
    console.error('Failed to remove cached requirement:', error);
  }
}

/**
 * Get cached requirements for offline use
 * Returns null if cache expired (unless offline, then returns expired cache)
 */
export async function getCachedRequirements(userId: string, allowExpired: boolean = false): Promise<CachedRequirement[] | null> {
  try {
    const metadata = await db.cacheMetadata.get(`requirements_${userId}`);

    if (!metadata) {
      return null;
    }

    // Check if cache is still valid
    const isExpired = metadata.expiresAt < Date.now();
    
    // If expired and not allowing expired cache, return null
    if (isExpired && !allowExpired) {
      return null;
    }

    // If offline, allow expired cache
    const isOffline = !navigator.onLine;
    if (isExpired && !isOffline && !allowExpired) {
      return null;
    }

    const cached = await db.requirements.where('user_id').equals(userId).toArray();
    
    // If using expired cache, log it
    if (isExpired && (isOffline || allowExpired)) {
      console.log(`[getCachedRequirements] Using expired cache (offline: ${isOffline})`);
    }

    return cached;
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
    const existing = await db.consultants.where('user_id').equals(userId).toArray();
    const newIds = new Set(consultants.map(c => c.id));
    const toDelete = existing.filter(c => !newIds.has(c.id)).map(c => c.id);
    if (toDelete.length) await db.consultants.bulkDelete(toDelete as string[]);

    const CHUNK = 500;
    for (let i = 0; i < consultants.length; i += CHUNK) {
      await db.consultants.bulkPut(consultants.slice(i, i + CHUNK));
    }

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
    // Only remove interviews that belong to this user and are no longer present
    const existing = await db.interviews.where('requirement_id').notEqual('').toArray();
    const userExisting = (existing as CachedInterview[]).filter(e => e && e.user_id === userId);
    const newIds = new Set(interviews.map(i => i.id));
    const toDelete = userExisting.filter(i => !newIds.has(i.id)).map(i => i.id);
    if (toDelete.length) await db.interviews.bulkDelete(toDelete as string[]);

    // Upsert interviews in chunks
    const CHUNK = 500;
    for (let i = 0; i < interviews.length; i += CHUNK) {
      await db.interviews.bulkPut(interviews.slice(i, i + CHUNK));
    }

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
 * Clear cached requirements for a specific user
 * Use this when requirements are deleted from the server
 */
export async function clearCachedRequirements(userId: string): Promise<void> {
  try {
    await db.requirements.where('user_id').equals(userId).delete();
    await db.cacheMetadata.delete(`requirements_${userId}`);
  } catch (error) {
    console.error('Failed to clear cached requirements:', error);
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

// ============= FEATURE 1: OFFLINE SYNC QUEUE =============

/**
 * Add operation to sync queue (create/update/delete when offline)
 */
export async function addToSyncQueue(
  operation: SyncQueueItem['operation'],
  entityType: SyncQueueItem['entityType'],
  entityId: string,
  payload: Record<string, unknown>
): Promise<string> {
  try {
    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const item: SyncQueueItem = {
      id,
      operation,
      entityType,
      entityId,
      payload,
      timestamp: Date.now(),
      retries: 0,
      status: 'pending',
    };
    
    await db.syncQueue.add(item);
    dispatchSyncQueueChanged();
    return id;
  } catch (error) {
    console.error('Failed to add to sync queue:', error);
    throw error;
  }
}

/**
 * Get pending sync items
 */
export async function getPendingSyncItems(): Promise<SyncQueueItem[]> {
  try {
    return await db.syncQueue.where('status').anyOf(['pending', 'failed']).toArray();
  } catch (error) {
    console.error('Failed to get pending sync items:', error);
    return [];
  }
}

/**
 * Update sync item status
 */
export async function updateSyncItemStatus(
  id: string,
  status: SyncQueueItem['status'],
  error?: string
): Promise<void> {
  try {
    const existing = await db.syncQueue.get(id);
    const newRetries = status === 'failed' ? ((existing?.retries ?? 0) + 1) : 0;
    await db.syncQueue.update(id, {
      status,
      lastError: error,
      retries: newRetries,
    });
    dispatchSyncQueueChanged();
  } catch (error) {
    console.error('Failed to update sync item:', error);
  }
}

/**
 * Clear synced items from queue
 */
export async function clearSyncedItems(): Promise<void> {
  try {
    await db.syncQueue.where('status').notEqual('pending').delete();
    dispatchSyncQueueChanged();
  } catch (error) {
    console.error('Failed to clear synced items:', error);
  }
}

/**
 * Get pending conflicts awaiting user resolution
 */
export async function getPendingConflicts(): Promise<ConflictRecord[]> {
  try {
    return await db.conflicts
      .where('strategy')
      .equals('pending')
      .toArray();
  } catch (error) {
    console.error('Failed to get pending conflicts:', error);
    return [];
  }
}

/**
 * Resolve a conflict by letting user choose which version to keep
 * @param conflictId - The conflict ID
 * @param selectedVersion - Which version to apply: 'local' or 'remote'
 */
export async function resolveConflict(conflictId: string, selectedVersion: 'local' | 'remote'): Promise<void> {
  try {
    const conflict = await db.conflicts.get(conflictId);
    if (!conflict) {
      throw new Error(`Conflict ${conflictId} not found`);
    }

    // Update the conflict record
    await db.conflicts.update(conflictId, {
      strategy: selectedVersion,
      userResolved: true,
      resolvedAt: Date.now(),
      selectedVersion,
    });

    // Find the sync queue item for this conflict
    const syncItem = await db.syncQueue
      .where('entityId')
      .equals(conflict.entityId)
      .filter((item: SyncQueueItem) => item.operation === 'UPDATE')
      .first();

    if (syncItem) {
      // Update the payload with the selected version
      const updatedPayload = selectedVersion === 'local' 
        ? conflict.localVersion 
        : conflict.remoteVersion;

      await db.syncQueue.update(syncItem.id, {
        payload: updatedPayload,
        lastError: undefined,
        status: 'pending',
      });

      dispatchSyncQueueChanged();
      console.log(`Conflict resolved for ${conflict.entityId}: ${selectedVersion} version selected`);
    }
  } catch (error) {
    console.error('Failed to resolve conflict:', error);
    throw error;
  }
}

/**
 * Process pending sync queue items with exponential backoff on failures.
 * Attempts a limited batch and removes successfully-synced items from the queue.
 * Detects and handles conflicts (local vs remote changes).
 */
export async function processSyncQueue(batchSize: number = 10): Promise<{ processed: number; failed: number; conflicts: number }> {
  try {
    const now = Date.now();
    // Only pick items that are pending and ready to be retried (nextAttempt <= now or undefined)
    const items = await db.syncQueue
      .orderBy('timestamp')
      .filter((it: SyncQueueItem) => (it.status === 'pending' || it.status === 'failed') && (!it.nextAttempt || it.nextAttempt <= now))
      .limit(batchSize)
      .toArray();

    let processed = 0;
    let failed = 0;
    let conflicts = 0;

    for (const item of items) {
      // mark as syncing
      await db.syncQueue.update(item.id, { status: 'syncing' });
      dispatchSyncQueueChanged();

      try {
        // For UPDATE operations, check for conflicts
        if (item.operation === 'UPDATE' && item.entityType === 'requirement') {
          // Fetch current server version
          const { data: serverData, error: fetchError } = await supabase
            .from('requirements')
            .select('*')
            .eq('id', item.entityId)
            .single();

          if (!fetchError && serverData) {
            // Check if local (queued) version is outdated compared to server
            const localUpdateTime = item.timestamp;
            const serverUpdateTime = new Date(serverData.updated_at).getTime();

            // If server was updated AFTER this operation was queued, conflict detected
            if (serverUpdateTime > localUpdateTime) {
              // IMPROVED: Move conflict to "Conflict State" instead of auto-resolving
              console.warn(`[Conflict Detected] Local change for requirement ${item.entityId} - moving to pending resolution`);
              
              // Store conflict for user review
              const conflictId = `${item.entityId}-${item.timestamp}`;
              await db.conflicts.put({
                id: conflictId,
                entityType: 'requirement',
                entityId: item.entityId,
                strategy: 'pending',
                timestamp: Date.now(),
                localVersion: item.payload,
                remoteVersion: serverData as Record<string, unknown>,
                userResolved: false,
              });

              conflicts++;
              
              // Mark sync queue item as pending user resolution instead of failing
              await db.syncQueue.update(item.id, {
                status: 'pending',
                lastError: 'Conflict detected - awaiting user resolution',
              });
              
              dispatchSyncQueueChanged();
              continue; // Skip the operation execution, wait for user resolution
            }
          }
        }

        // Execute operation
        if (item.entityType === 'requirement') {
          if (item.operation === 'CREATE') {
            const { data, error } = await supabase
              .from('requirements')
              .insert(item.payload as Record<string, unknown>)
              .select('*');
            if (error) throw error;

            const created = (data && data.length > 0 ? data[0] : null) as (CachedRequirement | null);
            const tempId = item.entityId;

            if (created && typeof created.id === 'string' && tempId.startsWith('temp-')) {
              const newId = created.id;
              const createdUserId = created.user_id;

              await db.transaction('rw', db.requirements, db.syncQueue, db.cacheMetadata, async () => {
                // Replace cached temp requirement with server-created record
                const existingTemp = await db.requirements.get(tempId);
                if (existingTemp) {
                  await db.requirements.delete(tempId);
                }
                await db.requirements.put(created);

                // Rewrite any queued operations that referenced the tempId to the real id
                const related = await db.syncQueue.where('entityId').equals(tempId).toArray();
                for (const rel of related) {
                  if (rel.id === item.id) continue;
                  const nextPayload: Record<string, unknown> = { ...(rel.payload || {}) };
                  if (nextPayload.id === tempId) nextPayload.id = newId;
                  if (nextPayload.requirement_id === tempId) nextPayload.requirement_id = newId;

                  await db.syncQueue.update(rel.id, {
                    entityId: newId,
                    payload: nextPayload,
                  });
                }

                // Keep cache metadata count accurate
                const metaKey = `requirements_${createdUserId}`;
                const meta = await db.cacheMetadata.get(metaKey);
                if (meta) {
                  const count = await db.requirements.where('user_id').equals(createdUserId).count();
                  await db.cacheMetadata.put({
                    ...meta,
                    count,
                  });
                }
              });
            }
          } else if (item.operation === 'UPDATE') {
            const { error } = await supabase.from('requirements').update(item.payload as Record<string, unknown>).eq('id', item.entityId).select();
            if (error) throw error;
          } else if (item.operation === 'DELETE') {
            const { error } = await supabase.from('requirements').delete().eq('id', item.entityId);
            if (error) throw error;
          }
        } else {
          const table = `${item.entityType}s`;
          if (item.operation === 'CREATE') {
            const { error } = await supabase.from(table).insert(item.payload as Record<string, unknown>);
            if (error) throw error;
          } else if (item.operation === 'UPDATE') {
            const { error } = await supabase.from(table).update(item.payload as Record<string, unknown>).eq('id', item.entityId);
            if (error) throw error;
          } else if (item.operation === 'DELETE') {
            const { error } = await supabase.from(table).delete().eq('id', item.entityId);
            if (error) throw error;
          }
        }

        // success: remove from queue
        await db.syncQueue.delete(item.id);
        dispatchSyncQueueChanged();
        processed++;
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        const retries = (item.retries ?? 0) + 1;
        // Exponential backoff capped at 1 hour
        const nextAttempt = Date.now() + Math.min(60 * 60 * 1000, Math.pow(2, retries) * 1000);
        await db.syncQueue.update(item.id, {
          status: 'failed',
          lastError: errMsg,
          retries,
          nextAttempt,
        } as Partial<SyncQueueItem>);
        dispatchSyncQueueChanged();
        failed++;
      }
    }

    return { processed, failed, conflicts };
  } catch (error) {
    console.error('Failed to process sync queue:', error);
    return { processed: 0, failed: 0, conflicts: 0 };
  }
}

// ============= FEATURE 3: EXPANDED CACHE COVERAGE =============

/**
 * Cache documents data locally
 */
export async function cacheDocuments(
  documents: CachedDocument[],
  userId: string
): Promise<void> {
  try {
    const existing = await db.documents.where('user_id').equals(userId).toArray();
    const newIds = new Set(documents.map(d => d.id));
    const toDelete = existing.filter(d => !newIds.has(d.id)).map(d => d.id);
    if (toDelete.length) await db.documents.bulkDelete(toDelete as string[]);

    const CHUNK = 500;
    for (let i = 0; i < documents.length; i += CHUNK) {
      await db.documents.bulkPut(documents.slice(i, i + CHUNK));
    }

    await db.cacheMetadata.put({
      key: `documents_${userId}`,
      lastUpdated: Date.now(),
      expiresAt: Date.now() + CACHE_DURATIONS.REQUIREMENTS,
      count: documents.length,
    });
  } catch (error) {
    console.error('Failed to cache documents:', error);
  }
}

/**
 * Get cached documents for offline use
 */
export async function getCachedDocuments(userId: string): Promise<CachedDocument[] | null> {
  try {
    const metadata = await db.cacheMetadata.get(`documents_${userId}`);

    if (!metadata || metadata.expiresAt < Date.now()) {
      return null;
    }

    return await db.documents.where('user_id').equals(userId).toArray();
  } catch (error) {
    console.error('Failed to get cached documents:', error);
    return null;
  }
}

/**
 * Cache emails data locally
 */
export async function cacheEmails(
  emails: CachedEmail[],
  userId: string
): Promise<void> {
  try {
    // Bulk upsert emails in chunks (avoid deleting globally, emails can be global across requirements)
    const CHUNK = 500;
    for (let i = 0; i < emails.length; i += CHUNK) {
      await db.emails.bulkPut(emails.slice(i, i + CHUNK));
    }

    await db.cacheMetadata.put({
      key: `emails_${userId}`,
      lastUpdated: Date.now(),
      expiresAt: Date.now() + CACHE_DURATIONS.REQUIREMENTS,
      count: emails.length,
    });
  } catch (error) {
    console.error('Failed to cache emails:', error);
  }
}

/**
 * Get cached emails for offline use
 */
export async function getCachedEmails(): Promise<CachedEmail[] | null> {
  try {
    return await db.emails.toArray();
  } catch (error) {
    console.error('Failed to get cached emails:', error);
    return null;
  }
}

// ============= FEATURE 5: CACHE STORAGE MANAGEMENT =============

/**
 * Get current cache size in bytes
 */
export async function getCacheSize(): Promise<number> {
  try {
    if (navigator.storage?.estimate) {
      const estimate = await navigator.storage.estimate();
      return estimate.usage || 0;
    }
    return 0;
  } catch (error) {
    console.error('Failed to get cache size:', error);
    return 0;
  }
}

/**
 * Get cache quota in bytes
 */
export async function getCacheQuota(): Promise<number> {
  try {
    if (navigator.storage?.estimate) {
      const estimate = await navigator.storage.estimate();
      return estimate.quota || 0;
    }
    return 0;
  } catch (error) {
    console.error('Failed to get cache quota:', error);
    return 0;
  }
}

/**
 * Request persistent storage permission
 */
export async function requestPersistentStorage(): Promise<boolean> {
  try {
    if (navigator.storage?.persist) {
      return await navigator.storage.persist();
    }
    return false;
  } catch (error) {
    console.error('Failed to request persistent storage:', error);
    return false;
  }
}

// ============= FEATURE 6: SYNC PROGRESS TRACKING =============

/**
 * Get current sync status
 */
export async function getSyncStatus(): Promise<SyncStatus> {
  try {
    const queue = await db.syncQueue.toArray();
    const syncing = queue.filter(q => q.status === 'syncing');
    const failed = queue.filter(q => q.status === 'failed');
    const metadata = await db.cacheMetadata.get('lastSyncTime');

    const totalItems = queue.length;
    const completedItems = totalItems - syncing.length;
    const progress = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 100;

    return {
      isSyncing: syncing.length > 0,
      itemsRemaining: syncing.length,
      lastSyncTime: metadata?.lastUpdated ?? null,
      failedItems: failed.length,
      progress,
      totalItems,
    };
  } catch (error) {
    console.error('Failed to get sync status:', error);
    return {
      isSyncing: false,
      itemsRemaining: 0,
      lastSyncTime: null,
      failedItems: 0,
      progress: 100,
      totalItems: 0,
    };
  }
}

/**
 * Update last sync time
 */
export async function updateLastSyncTime(): Promise<void> {
  try {
    await db.cacheMetadata.put({
      key: 'lastSyncTime',
      lastUpdated: Date.now(),
      expiresAt: Date.now() + 365 * 24 * 60 * 60 * 1000, // 1 year
    });
  } catch (error) {
    console.error('Failed to update last sync time:', error);
  }
}

// ============= FEATURE 7: CONFLICT RESOLUTION =============

/**
 * Record a conflict for resolution
 */
export async function recordConflict(
  entityType: string,
  entityId: string,
  localVersion: Record<string, unknown>,
  remoteVersion: Record<string, unknown>
): Promise<void> {
  try {
    const conflict: ConflictRecord = {
      id: `${entityType}-${entityId}-${Date.now()}`,
      entityType,
      entityId,
      strategy: 'local', // Default to local, user can change
      timestamp: Date.now(),
      localVersion,
      remoteVersion,
    };

    await db.conflicts.add(conflict);
  } catch (error) {
    console.error('Failed to record conflict:', error);
  }
}

/**
 * Get unresolved conflicts
 */
export async function getUnresolvedConflicts(): Promise<ConflictRecord[]> {
  try {
    return await db.conflicts.toArray();
  } catch (error) {
    console.error('Failed to get conflicts:', error);
    return [];
  }
}

/**
 * Clear resolved conflicts
 */
export async function clearResolvedConflicts(): Promise<void> {
  try {
    await db.conflicts.clear();
  } catch (error) {
    console.error('Failed to clear conflicts:', error);
  }
}

// ============= FEATURE 4: SMART PRELOADING =============

/**
 * Preload all user data for offline access
 * This function should be called when user is online to proactively cache data
 */
export async function preloadUserData(userId?: string): Promise<void> {
  try {
    // Only preload if online
    if (!navigator.onLine) {
      console.log('[preloadUserData] Skipping preload - device is offline');
      return;
    }

    if (!userId) {
      console.warn('[preloadUserData] No userId provided, skipping preload');
      return;
    }

    const prefs = await getCachePreferences();
    const defaultPrefs: CachePreferences = {
      key: 'userPreferences',
      cacheRequirements: true,
      cacheConsultants: true,
      cacheInterviews: true,
      cacheDocuments: true,
      cacheEmails: true,
      maxCacheSize: 100,
      syncOnWiFiOnly: false,
    };
    const effectivePrefs = prefs || defaultPrefs;

    // Dynamically import API functions to avoid circular dependencies
    const [
      { getRequirementsPage },
      { getConsultants },
      { getInterviews },
    ] = await Promise.all([
      import('./api/requirements'),
      import('./api/consultants'),
      import('./api/interviews'),
    ]);

    const preloadPromises: Promise<void>[] = [];

    // Preload requirements
    if (effectivePrefs.cacheRequirements) {
      preloadPromises.push(
        getRequirementsPage({ userId, limit: 1000, includeCount: false })
          .then(result => {
            if (result.success && result.requirements) {
              const cachedReqs = result.requirements.map(r => ({ ...r } as CachedRequirement));
              return cacheRequirements(cachedReqs, userId);
            }
          })
          .then(() => console.log('[preloadUserData] Requirements cached'))
          .catch(err => console.error('[preloadUserData] Failed to cache requirements:', err))
      );
    }

    // Preload consultants
    if (effectivePrefs.cacheConsultants) {
      preloadPromises.push(
        getConsultants(userId)
          .then(result => {
            if (result.success && result.consultants) {
              const cachedCons = result.consultants.map(c => ({ ...c } as CachedConsultant));
              return cacheConsultants(cachedCons, userId);
            }
          })
          .then(() => console.log('[preloadUserData] Consultants cached'))
          .catch(err => console.error('[preloadUserData] Failed to cache consultants:', err))
      );
    }

    // Preload interviews
    if (effectivePrefs.cacheInterviews) {
      preloadPromises.push(
        getInterviews(userId)
          .then(result => {
            if (result.success && result.interviews) {
              const cachedInts = result.interviews.map(i => ({ ...i } as CachedInterview));
              return cacheInterviews(cachedInts, userId);
            }
          })
          .then(() => console.log('[preloadUserData] Interviews cached'))
          .catch(err => console.error('[preloadUserData] Failed to cache interviews:', err))
      );
    }

    // Note: Documents and emails preloading would require their respective API functions
    // For now, we'll skip them as they may not be available or may require different handling

    await Promise.allSettled(preloadPromises);
    console.log('[preloadUserData] Preload completed');
  } catch (error) {
    console.error('[preloadUserData] Failed to preload user data:', error);
  }
}

// ============= FEATURE 8: SELECTIVE SYNC =============

/**
 * Get cache preferences
 */
export async function getCachePreferences(): Promise<CachePreferences | undefined> {
  try {
    return await db.cachePreferences.get('userPreferences');
  } catch (error) {
    console.error('Failed to get cache preferences:', error);
    return undefined;
  }
}

/**
 * Save cache preferences
 */
export async function saveCachePreferences(prefs: CachePreferences): Promise<void> {
  try {
    const prefsWithKey = { ...prefs, key: 'userPreferences' };
    await db.cachePreferences.put(prefsWithKey);
  } catch (error) {
    console.error('Failed to save cache preferences:', error);
  }
}

// ============= FEATURE 9: BACKGROUND SYNC API =============

/**
 * Register background sync
 */
export async function registerBackgroundSync(): Promise<void> {
  try {
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.ready;

      // If Background Sync API is available, register a sync tag
      const regWithSync = registration as unknown as { sync?: { register: (tag: string) => Promise<void> } };
      if ('SyncManager' in window && regWithSync.sync && typeof regWithSync.sync.register === 'function') {
        await regWithSync.sync.register('sync-offline-queue');
        console.log('Background sync registered');
      } else {
        // Fallback: notify service worker to use a messaging-based fallback
        if (registration.active && typeof registration.active.postMessage === 'function') {
          registration.active.postMessage({ type: 'register-sync-fallback' });
          console.log('Background sync not supported; fallback message sent to service worker');
        }
      }
    }
  } catch (error) {
    console.error('Failed to register background sync:', error);
  }
}

// ============= FEATURE 10: CACHE ANALYTICS =============

/**
 * Get cache analytics
 */
export async function getCacheAnalytics(): Promise<CacheAnalytics | undefined> {
  try {
    return await db.analytics.get('cacheStats');
  } catch (error) {
    console.error('Failed to get cache analytics:', error);
    return undefined;
  }
}

/**
 * Record analytics event
 */
export async function recordAnalytics(event: string, data: Record<string, unknown>): Promise<void> {
  try {
    const existing = await db.analytics.get('cacheStats');
    const analytics: CacheAnalytics = existing || {
      key: 'cacheStats',
      offlineTime: 0,
      itemsCreatedOffline: 0,
      itemsUpdatedOffline: 0,
      itemsDeletedOffline: 0,
      syncSuccessRate: 100,
      averageSyncTime: 0,
      totalSyncEvents: 0,
    };

    if (event === 'offline_create') analytics.itemsCreatedOffline += 1;
    if (event === 'offline_update') analytics.itemsUpdatedOffline += 1;
    if (event === 'offline_delete') analytics.itemsDeletedOffline += 1;
    if (event === 'sync_complete') analytics.totalSyncEvents += 1;
    if (event === 'offline_time' && typeof data.minutes === 'number') {
      analytics.offlineTime += data.minutes;
    }

    await db.analytics.put(analytics);
  } catch (error) {
    console.error('Failed to record analytics:', error);
  }
}
