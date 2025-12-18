import { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshCw, CloudLightning, AlertCircle } from 'lucide-react';
import { Modal } from './Modal';
import { useSyncQueue, useSyncStatus } from '../../hooks/useSyncStatus';
import { processSyncQueue } from '../../lib/offlineDB';

export const SyncQueueModal = () => {
  const { syncStatus, refresh } = useSyncStatus();
  const { pendingItems, pendingCount, clearSynced, updateItemStatus } = useSyncQueue();

  const [isOpen, setIsOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    const openHandler = () => setIsOpen(true);
    window.addEventListener('open-sync-queue', openHandler);
    return () => window.removeEventListener('open-sync-queue', openHandler);
  }, []);

  const failedCount = useMemo(
    () => pendingItems.filter((it) => it.status === 'failed').length,
    [pendingItems]
  );

  const handleClose = useCallback(() => setIsOpen(false), []);

  const handleProcess = useCallback(async () => {
    if (pendingCount === 0) return;
    setIsProcessing(true);
    try {
      await processSyncQueue(50);
      window.dispatchEvent(new CustomEvent('sync-complete'));
      await refresh();
    } finally {
      setIsProcessing(false);
    }
  }, [pendingCount, refresh]);

  const handleClear = useCallback(async () => {
    await clearSynced();
    window.dispatchEvent(new CustomEvent('sync-complete'));
    await refresh();
  }, [clearSynced, refresh]);

  const handleRetryFailed = useCallback(async () => {
    const failed = pendingItems.filter((it) => it.status === 'failed');
    if (failed.length === 0) return;

    setIsProcessing(true);
    try {
      for (const item of failed) {
        await updateItemStatus(item.id, 'pending');
      }
      window.dispatchEvent(new CustomEvent('sync-queue-changed'));
      await refresh();
    } finally {
      setIsProcessing(false);
    }
  }, [pendingItems, updateItemStatus, refresh]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Sync Queue"
      size="lg"
    >
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="text-sm text-gray-700">
            <div>
              Pending items: <span className="font-semibold">{pendingCount}</span>
            </div>
            <div>
              Status:{' '}
              <span className="font-semibold">
                {syncStatus?.isSyncing ? 'Syncing…' : 'Idle'}
              </span>
              {failedCount > 0 && (
                <span className="ml-2 text-xs text-red-700">
                  {failedCount} failed
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleProcess}
              disabled={isProcessing || pendingCount === 0}
              className="px-3 py-2 rounded-lg bg-primary-800 text-white hover:bg-primary-900 disabled:bg-gray-300 disabled:text-gray-600 transition flex items-center gap-2"
            >
              <CloudLightning className="w-4 h-4" />
              {isProcessing ? 'Processing…' : 'Process'}
            </button>

            <button
              onClick={handleClear}
              className="px-3 py-2 rounded-lg bg-gray-100 text-gray-800 hover:bg-gray-200 transition flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Clear
            </button>

            <button
              onClick={handleRetryFailed}
              disabled={isProcessing || failedCount === 0}
              className="px-3 py-2 rounded-lg bg-red-100 text-red-800 hover:bg-red-200 disabled:bg-gray-100 disabled:text-gray-400 transition flex items-center gap-2"
            >
              <AlertCircle className="w-4 h-4" />
              Retry failed
            </button>
          </div>
        </div>

        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <div className="max-h-[50vh] overflow-y-auto">
            {pendingItems.length === 0 ? (
              <div className="p-4 text-sm text-gray-500">No items in queue.</div>
            ) : (
              pendingItems.slice(0, 100).map((item) => (
                <div key={item.id} className="p-3 border-b border-gray-100">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-gray-900">
                        {item.entityType} · {item.operation}
                      </div>
                      <div className="text-xs text-gray-600 truncate">
                        {item.entityId}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        Status: {item.status} · Retries: {item.retries}
                        {item.nextAttempt ? ` · Next: ${new Date(item.nextAttempt).toLocaleString()}` : ''}
                      </div>
                      {item.lastError && (
                        <div className="text-xs text-red-700 mt-1 break-words">
                          {item.lastError}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
          {pendingItems.length > 100 && (
            <div className="p-3 text-xs text-gray-500">
              Showing 100 of {pendingItems.length} items.
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};
