/**
 * Hook for managing offline database and cache
 * Integrates IndexedDB caching throughout the app
 * Enhanced with sync queue, preloading, and analytics
 */

import { useEffect, useCallback, useState, useRef } from 'react';
import {
  cacheRequirements,
  getCachedRequirements,
  clearOfflineCache,
  preloadUserData,
  registerBackgroundSync,
  recordAnalytics,
  addToSyncQueue,
  getPendingSyncItems,
  processSyncQueue,
  updateLastSyncTime,
  type SyncQueueItem,
} from '../lib/offlineDB';

export function useOfflineCache() {
  const [isOnlineState, setIsOnlineState] = useState(() => {
    // Initialize from navigator.onLine immediately
    return navigator.onLine;
  });
  const [offlineStartTime, setOfflineStartTime] = useState<number | null>(null);

  const isOnlineRef = useRef(isOnlineState);
  const offlineStartTimeRef = useRef<number | null>(offlineStartTime);

  useEffect(() => {
    isOnlineRef.current = isOnlineState;
  }, [isOnlineState]);

  useEffect(() => {
    offlineStartTimeRef.current = offlineStartTime;
  }, [offlineStartTime]);

  // Function to sync pending items
  const syncPendingItems = useCallback(async () => {
    try {
      const pending = await getPendingSyncItems();
      if (pending.length === 0) return;

      // Only sync items that are eligible to be processed now (respect nextAttempt backoff)
      const now = Date.now();
      const due = pending.filter((it) => !it.nextAttempt || it.nextAttempt <= now);
      if (due.length === 0) return;

      console.log(`Syncing ${due.length} pending items...`);

      const startTime = Date.now();

      // Dispatch start-sync event BEFORE processing
      window.dispatchEvent(
        new CustomEvent('start-sync', { detail: { items: due } })
      );

      // Actually process the sync queue in batches
      const result = await processSyncQueue(20);
      
      // Update last sync time
      await updateLastSyncTime();

      // Record analytics
      const duration = Date.now() - startTime;
      await recordAnalytics('sync_complete', {
        itemsSynced: result.processed,
        timeMs: duration,
      });

      // Dispatch completion event AFTER processing
      window.dispatchEvent(new CustomEvent('sync-complete', { 
        detail: { 
          processed: result.processed, 
          failed: result.failed,
          conflicts: result.conflicts || 0
        } 
      }));

      // Show warning if conflicts detected
      if (result.conflicts && result.conflicts > 0) {
        console.warn(`[Sync] ${result.conflicts} conflict(s) detected - local version applied`);
        window.dispatchEvent(new CustomEvent('sync-conflicts', { 
          detail: { conflictCount: result.conflicts } 
        }));
      }

      console.log(`Sync completed: ${result.processed} processed, ${result.failed} failed, ${result.conflicts || 0} conflicts`);
    } catch (error) {
      console.error('Failed to sync pending items:', error);
      window.dispatchEvent(new CustomEvent('sync-error', { detail: { error: String(error) } }));
    }
  }, []);

  // Initialize offline state and register event listeners
  useEffect(() => {
    console.log(`[Offline Hook] Initialized with online status: ${navigator.onLine}`);

    const handleOnline = () => {
      console.log('App is online - syncing cache');
      setIsOnlineState(true);
      isOnlineRef.current = true;

      // Log offline duration if we were offline
      if (offlineStartTimeRef.current) {
        const durationMs = Date.now() - offlineStartTimeRef.current;
        const durationMinutes = Math.round(durationMs / 60000);
        void recordAnalytics('offline_time', { minutes: durationMinutes });
        setOfflineStartTime(null);
        offlineStartTimeRef.current = null;
      }

      // Auto sync pending items immediately when coming back online
      void syncPendingItems();
    };

    const handleOffline = () => {
      console.log('App is offline - using cache');
      setIsOnlineState(false);
      isOnlineRef.current = false;
      const now = Date.now();
      setOfflineStartTime(now);
      offlineStartTimeRef.current = now;
    };

    // Handle window focus to sync when user comes back to app
    const handleFocus = () => {
      if (isOnlineRef.current) {
        console.log('[Offline Hook] Window focused - checking for pending sync items');
        void syncPendingItems();
      }
    };

    const handleRetrySync = () => {
      if (isOnlineRef.current && navigator.onLine) {
        console.log('[Offline Hook] Manual retry requested - syncing pending items');
        void syncPendingItems();
      }
    };

    const handleQueueChanged = () => {
      if (isOnlineRef.current && navigator.onLine) {
        void syncPendingItems();
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('retry-sync', handleRetrySync as EventListener);

    // Process queue whenever it changes (no polling)
    window.addEventListener('sync-queue-changed', handleQueueChanged as EventListener);

    // Register background sync
    void registerBackgroundSync();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('retry-sync', handleRetrySync as EventListener);
      window.removeEventListener('sync-queue-changed', handleQueueChanged as EventListener);
    };
  }, [syncPendingItems]);

  // Listen for messages from the service worker (background sync trigger)
  useEffect(() => {
    const handleSWMessage = (e: Event) => {
      const data = (e as MessageEvent).data;
      if (!data || !data.type) return;
      if (data.type === 'background-sync') {
        void syncPendingItems();
      }
    };

    if (navigator.serviceWorker && 'addEventListener' in navigator.serviceWorker) {
      (navigator.serviceWorker as unknown as EventTarget).addEventListener('message', handleSWMessage);
    }

    window.addEventListener('message', handleSWMessage);

    return () => {
      if (navigator.serviceWorker && 'removeEventListener' in navigator.serviceWorker) {
        (navigator.serviceWorker as unknown as EventTarget).removeEventListener('message', handleSWMessage);
      }
      window.removeEventListener('message', handleSWMessage);
    };
  }, [syncPendingItems]);

  // Function to clear cache on logout
  const handleLogout = useCallback(async () => {
    await clearOfflineCache();
  }, []);

  // Function to add operation to sync queue
  const queueOfflineOperation = useCallback(
    async (
      operation: SyncQueueItem['operation'],
      entityType: SyncQueueItem['entityType'],
      entityId: string,
      payload: Record<string, unknown>
    ) => {
      const id = await addToSyncQueue(operation, entityType, entityId, payload);

      // Record analytics
      if (operation === 'CREATE') {
        await recordAnalytics('offline_create', { entityType });
      } else if (operation === 'UPDATE') {
        await recordAnalytics('offline_update', { entityType });
      } else if (operation === 'DELETE') {
        await recordAnalytics('offline_delete', { entityType });
      }

      return id;
    },
    []
  );

  // Function to preload data
  const preloadData = useCallback(async (userId?: string) => {
    try {
      await preloadUserData(userId);
    } catch (error) {
      console.error('Failed to preload user data:', error);
    }
  }, []);

  return {
    isOnline: isOnlineState,
    handleLogout,
    cacheRequirements,
    getCachedRequirements,
    queueOfflineOperation,
    syncPendingItems,
    preloadData,
  };
}
