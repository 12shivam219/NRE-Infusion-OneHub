import { useCallback, useState } from 'react';
import { RefreshCw, CloudLightning } from 'lucide-react';
import { useSyncStatus, useSyncQueue } from '../../hooks/useSyncStatus';
import { processSyncQueue } from '../../lib/offlineDB';
import { ConfirmDialog } from './ConfirmDialog';

export const SyncControls = () => {
  const { syncStatus, refresh } = useSyncStatus();
  const { pendingCount, clearSynced } = useSyncQueue();
  const [isProcessing, setIsProcessing] = useState(false);
  const [ariaMessage, setAriaMessage] = useState('');
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const handleProcess = useCallback(async () => {
    setIsProcessing(true);
    try {
      const result = await processSyncQueue(20);
      // notify listeners to refresh status
      window.dispatchEvent(new CustomEvent('sync-complete'));
      setAriaMessage(`Sync completed. ${result.processed ?? 0} items processed, ${result.failed ?? 0} failed.`);
      setTimeout(() => setAriaMessage(''), 5000);
      // small delay and refresh
      setTimeout(() => refresh(), 500);
      return result;
    } finally {
      setIsProcessing(false);
    }
  }, [refresh]);

  const handleProcessClick = useCallback(() => {
    const LARGE_SYNC_THRESHOLD = 500;
    if (pendingCount > LARGE_SYNC_THRESHOLD) {
      setShowConfirmDialog(true);
    } else {
      void handleProcess();
    }
  }, [pendingCount, handleProcess]);

  return (
    <div className="flex items-center gap-3 px-2">
      <div className="text-right hidden sm:block">
          <div className="text-xs text-gray-500">Sync</div>
          <div
            className="text-sm font-medium text-gray-800"
            title={syncStatus?.lastSyncTime ? `Last synced: ${new Date(syncStatus.lastSyncTime).toLocaleString()}` : 'Not synced yet'}
          >
            {syncStatus ? `${syncStatus.progress}%` : 'Idle'}
            {syncStatus && syncStatus.failedItems > 0 && (
              <span className="ml-2 text-xs text-red-600">{syncStatus.failedItems} failed</span>
            )}
          </div>
      </div>

      <button
        onClick={handleProcessClick}
        disabled={isProcessing || pendingCount === 0}
        className={`flex items-center gap-2 px-3 py-2 rounded-md ${pendingCount === 0 ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : 'bg-white border border-primary-600 text-primary-600 hover:bg-primary-50'} disabled:opacity-60`}
        title={pendingCount === 0 ? 'No pending items to process' : 'Process offline sync queue'}
        aria-disabled={isProcessing || pendingCount === 0}
      >
        <CloudLightning className="w-4 h-4" />
        {isProcessing ? (
          <>
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            <span className="hidden sm:inline text-sm">Processing</span>
          </>
        ) : (
          <span className="hidden sm:inline text-sm">Process Sync</span>
        )}
      </button>

      <button
        onClick={async () => { await clearSynced(); refresh(); }}
        className="p-2 rounded-md bg-white border border-gray-200 text-gray-700 hover:bg-gray-50"
        title="Clear synced/failed items"
      >
        <RefreshCw className="w-4 h-4" />
      </button>

      <button
        onClick={() => window.dispatchEvent(new CustomEvent('open-sync-queue'))}
        className="text-xs text-gray-500 hover:text-gray-700"
        title="Open sync queue details"
      >
        Pending: <span className="font-medium text-gray-800">{pendingCount}</span>
      </button>
      {/* ARIA live region for announcements */}
      <div aria-live="polite" className="sr-only" role="status">
        {ariaMessage}
      </div>

      {/* Large Sync Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showConfirmDialog}
        onClose={() => setShowConfirmDialog(false)}
        onConfirm={async () => {
          setShowConfirmDialog(false);
          await handleProcess();
        }}
        title="Process Large Sync Queue"
        message={`This will process ${pendingCount} items. This may take a while. Continue?`}
        confirmLabel="Process"
        cancelLabel="Cancel"
        variant="warning"
        isLoading={isProcessing}
      />
    </div>
  );
};

export default SyncControls;
