import { useEffect, useState, useCallback } from 'react';
import {
  getCachePreferences as fetchPreferences,
  saveCachePreferences as savePrefs,
  getCacheSize,
  getCacheQuota,
  requestPersistentStorage,
  recordAnalytics,
} from '../lib/offlineDB';
import type { CachePreferences } from '../lib/offlineDB';

const DEFAULT_PREFERENCES: CachePreferences = {
  cacheRequirements: true,
  cacheConsultants: true,
  cacheInterviews: true,
  cacheDocuments: true,
  cacheEmails: true,
  maxCacheSize: 50, // MB
  syncOnWiFiOnly: false,
};

/**
 * Feature 8: Hook for managing cache preferences
 * Let users control what gets cached and storage limits
 */
export function useCachePreferences() {
  const [preferences, setPreferences] = useState<CachePreferences>(DEFAULT_PREFERENCES);
  const [cacheSize, setCacheSize] = useState(0);
  const [cacheQuota, setCacheQuota] = useState(0);
  const [isPersistent, setIsPersistent] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadPreferences = async () => {
      try {
        const prefs = await fetchPreferences();
        if (prefs) {
          setPreferences(prefs);
        }

        // Get storage info
        const size = await getCacheSize();
        const quota = await getCacheQuota();
        setCacheSize(Math.round(size / 1024 / 1024)); // Convert to MB
        setCacheQuota(Math.round(quota / 1024 / 1024)); // Convert to MB

        // Check if storage is persistent
        if (navigator.storage?.persisted) {
          const persistent = await navigator.storage.persisted();
          setIsPersistent(persistent);
        }

        setIsLoading(false);
      } catch (error) {
        console.error('Failed to load cache preferences:', error);
        setIsLoading(false);
      }
    };

    loadPreferences();
  }, []);

  const updatePreferences = useCallback(
    async (newPrefs: Partial<CachePreferences>) => {
      const updated = { ...preferences, ...newPrefs };
      setPreferences(updated);
      await savePrefs(updated);
      await recordAnalytics('preferences_changed', { changes: newPrefs });
    },
    [preferences]
  );

  const requestPersistence = useCallback(async () => {
    try {
      const persistent = await requestPersistentStorage();
      setIsPersistent(persistent);
      await recordAnalytics('persistent_storage_requested', { granted: persistent });
    } catch (error) {
      console.error('Failed to request persistent storage:', error);
    }
  }, []);

  const getCachePercentage = useCallback(() => {
    return cacheQuota > 0 ? Math.round((cacheSize / cacheQuota) * 100) : 0;
  }, [cacheSize, cacheQuota]);

  return {
    preferences,
    updatePreferences,
    cacheSize,
    cacheQuota,
    cachePercentage: getCachePercentage(),
    isPersistent,
    requestPersistence,
    isLoading,
  };
}
