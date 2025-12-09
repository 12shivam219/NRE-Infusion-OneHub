/**
 * Hook for managing offline database and cache
 * Integrates IndexedDB caching throughout the app
 */

import { useEffect, useCallback } from 'react';
import {
  cacheRequirements,
  getCachedRequirements,
  clearOfflineCache,
  isOnline,
} from '../lib/offlineDB';

export function useOfflineCache() {
  // Handle online/offline transitions
  useEffect(() => {
    const handleOnline = () => {
      console.log('App is online - syncing cache');
      // Trigger revalidation of all cached data
      window.dispatchEvent(new Event('online'));
    };

    const handleOffline = () => {
      console.log('App is offline - using cache');
      window.dispatchEvent(new Event('offline'));
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Function to clear cache on logout
  const handleLogout = useCallback(async () => {
    await clearOfflineCache();
  }, []);

  return {
    isOnline: isOnline(),
    handleLogout,
    cacheRequirements,
    getCachedRequirements,
  };
}
