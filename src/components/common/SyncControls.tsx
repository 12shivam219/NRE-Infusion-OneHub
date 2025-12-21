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
    <div className="flex items-center gap-3 px-2 text-white">
      <div className="hidden text-right sm:block">
          <div className="text-xs font-body text-white/70">Sync</div>
          <div
            className="text-xs font-medium font-heading text-white"
            title={syncStatus?.lastSyncTime ? `Last synced: ${new Date(syncStatus.lastSyncTime).toLocaleString()}` : 'Not synced yet'}
          >
            {syncStatus ? `${syncStatus.progress}%` : 'Idle'}
            {syncStatus && syncStatus.failedItems > 0 && (
              <span className="ml-2 text-xs text-red-400">{syncStatus.failedItems} failed</span>
            )}
          </div>
      </div>

      <button
        onClick={handleProcessClick}
        disabled={isProcessing || pendingCount === 0}
        className={`flex items-center gap-2 rounded-lg px-3 py-2 font-body transition-all ${pendingCount === 0 ? 'bg-white/10 text-white/50 cursor-not-allowed' : 'bg-white text-[#0f172a] hover:bg-white/90 hover:shadow-[0_0_12px_rgba(255,255,255,0.45)]'} disabled:opacity-60`}
        title={pendingCount === 0 ? 'No pending items to process' : 'Process offline sync queue'}
        aria-disabled={isProcessing || pendingCount === 0}
      >
        <CloudLightning className={`${pendingCount === 0 ? 'text-white/60' : 'text-[#0f172a]' } h-4 w-4`} />
        {isProcessing ? (
          <>
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#0f172a] border-t-transparent" />
            <span className="hidden text-xs font-heading sm:inline">Processing</span>
          </>
        ) : (
          <span className="hidden text-xs font-heading sm:inline">Process Sync</span>
        )}
      </button>

      <button
        onClick={async () => { await clearSynced(); refresh(); }}
        className="rounded-lg border border-white/20 bg-white/5 p-2 text-white transition-all hover:bg-white/10"
        title="Clear synced/failed items"
      >
        <RefreshCw className="h-4 w-4" />
      </button>

      <button
        onClick={() => window.dispatchEvent(new CustomEvent('open-sync-queue'))}
        className="text-xs font-body text-white/70 transition-colors hover:text-white"
        title="Open sync queue details"
      >
        Pending: <span className="font-heading font-medium text-white">{pendingCount}</span>
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
