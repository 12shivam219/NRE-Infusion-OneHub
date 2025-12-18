import { useEffect, useState } from 'react';
import { AlertCircle, X, RefreshCw } from 'lucide-react';
import { getPendingSyncItems, updateSyncItemStatus, getUnresolvedConflicts } from '../../lib/offlineDB';
import { useToast } from '../../contexts/ToastContext';
import type { SyncQueueItem, ConflictRecord } from '../../lib/offlineDB';

/**
 * Component to handle and display sync errors, failed items, and conflicts
 * Allows users to retry failed syncs and resolve conflicts
 */
export const SyncErrorHandler = () => {
  const { showToast } = useToast();
  const [failedItems, setFailedItems] = useState<SyncQueueItem[]>([]);
  const [conflicts, setConflicts] = useState<ConflictRecord[]>([]);
  const [showFailedPanel, setShowFailedPanel] = useState(false);
  const [showConflictPanel, setShowConflictPanel] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);

  // Check for failed items and conflicts periodically
  useEffect(() => {
    const checkErrors = async () => {
      try {
        const pending = await getPendingSyncItems();
        const failedItems = pending.filter(item => item.status === 'failed');
        const unresolvedConflicts = await getUnresolvedConflicts();

        setFailedItems(failedItems);
        setConflicts(unresolvedConflicts);

        // Show toast if new failures detected
        if (failedItems.length > 0) {
          console.warn(`[SyncErrorHandler] ${failedItems.length} failed sync item(s) detected`);
        }

        if (unresolvedConflicts.length > 0) {
          console.warn(`[SyncErrorHandler] ${unresolvedConflicts.length} unresolved conflict(s) detected`);
        }
      } catch (error) {
        console.error('Failed to check sync errors:', error);
      }
    };

    // Check on mount
    void checkErrors();

    // Listen for sync events
    const handleSyncComplete = () => void checkErrors();
    const handleSyncError = () => void checkErrors();
    const handleSyncConflicts = () => void checkErrors();

    window.addEventListener('sync-complete', handleSyncComplete);
    window.addEventListener('sync-error', handleSyncError);
    window.addEventListener('sync-conflicts', handleSyncConflicts);

    // Also update when the queue changes (no polling)
    window.addEventListener('sync-queue-changed', handleSyncComplete);

    return () => {
      window.removeEventListener('sync-complete', handleSyncComplete);
      window.removeEventListener('sync-error', handleSyncError);
      window.removeEventListener('sync-conflicts', handleSyncConflicts);
      window.removeEventListener('sync-queue-changed', handleSyncComplete);
    };
  }, []);

  const handleRetryFailed = async () => {
    if (failedItems.length === 0) return;

    setIsRetrying(true);
    try {
      // Retry all failed items by resetting their status to pending
      for (const item of failedItems) {
        await updateSyncItemStatus(item.id, 'pending');
      }

      showToast({
        type: 'info',
        title: 'Retrying Failed Items',
        message: `Attempting to sync ${failedItems.length} failed item(s)...`,
      });

      // Trigger sync
      window.dispatchEvent(new CustomEvent('retry-sync'));
    } catch {
      showToast({
        type: 'error',
        title: 'Retry Failed',
        message: 'Could not retry failed items. Please try again later.',
      });
    } finally {
      setIsRetrying(false);
    }
  };

  if (failedItems.length === 0 && conflicts.length === 0) {
    return null;
  }

  return (
    <>
      {/* Failed Items Indicator */}
      {failedItems.length > 0 && (
        <div className="fixed top-4 right-4 z-50 bg-red-50 border border-red-300 rounded-lg shadow-lg max-w-sm">
          <div className="p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-red-900">Sync Issues</h3>
                <p className="text-sm text-red-800 mt-1">
                  {failedItems.length} item{failedItems.length !== 1 ? 's' : ''} failed to sync
                </p>
                <div className="mt-2 text-xs text-red-700 max-h-20 overflow-y-auto">
                  {failedItems.slice(0, 3).map(item => (
                    <div key={item.id} className="mb-1">
                      • {item.operation.toUpperCase()} {item.entityType} - Retry {item.retries}
                      {item.lastError && (
                        <div className="text-red-600 ml-2">{item.lastError.substring(0, 50)}...</div>
                      )}
                    </div>
                  ))}
                  {failedItems.length > 3 && <div>+ {failedItems.length - 3} more...</div>}
                </div>
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={handleRetryFailed}
                    disabled={isRetrying}
                    className="px-3 py-1.5 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white rounded text-sm font-medium flex items-center gap-1 transition-colors"
                  >
                    <RefreshCw className={`w-3 h-3 ${isRetrying ? 'animate-spin' : ''}`} />
                    Retry
                  </button>
                  <button
                    onClick={() => setShowFailedPanel(true)}
                    className="px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-800 rounded text-sm font-medium transition-colors"
                  >
                    Details
                  </button>
                </div>
              </div>
              <button
                onClick={() => setShowFailedPanel(false)}
                className="p-1 hover:bg-red-100 rounded transition-colors flex-shrink-0"
              >
                <X className="w-4 h-4 text-red-600" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Conflicts Indicator */}
      {conflicts.length > 0 && (
        <div className="fixed top-4 right-4 z-50 bg-yellow-50 border border-yellow-300 rounded-lg shadow-lg max-w-sm">
          <div className="p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-yellow-900">Data Conflicts</h3>
                <p className="text-sm text-yellow-800 mt-1">
                  {conflicts.length} item{conflicts.length !== 1 ? 's' : ''} have conflicting changes
                </p>
                <p className="text-xs text-yellow-700 mt-1">
                  Your local changes were applied (local version wins)
                </p>
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => setShowConflictPanel(true)}
                    className="px-3 py-1.5 bg-yellow-600 hover:bg-yellow-700 text-white rounded text-sm font-medium transition-colors"
                  >
                    Review
                  </button>
                </div>
              </div>
              <button
                onClick={() => setShowConflictPanel(false)}
                className="p-1 hover:bg-yellow-100 rounded transition-colors flex-shrink-0"
              >
                <X className="w-4 h-4 text-yellow-600" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Failed Items Details Panel */}
      {showFailedPanel && failedItems.length > 0 && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">Failed Sync Items</h2>
              <button
                onClick={() => setShowFailedPanel(false)}
                className="p-1 hover:bg-gray-100 rounded transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-3">
              {failedItems.map(item => (
                <div key={item.id} className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900">
                        {item.operation.toUpperCase()} - {item.entityType}
                      </p>
                      <p className="text-xs text-gray-500">ID: {item.entityId.substring(0, 20)}...</p>
                    </div>
                    <div className="text-right">
                      <span className="inline-block px-2 py-1 bg-red-100 text-red-800 text-xs font-medium rounded">
                        Retry {item.retries}
                      </span>
                    </div>
                  </div>

                  {item.lastError && (
                    <div className="mb-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
                      <p className="font-semibold mb-1">Error:</p>
                      <p className="font-mono text-xs break-words">{item.lastError}</p>
                    </div>
                  )}

                  <div className="mb-2 p-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-700 max-h-32 overflow-y-auto">
                    <p className="font-semibold mb-1">Data:</p>
                    <pre className="font-mono text-xs whitespace-pre-wrap break-words">
                      {JSON.stringify(item.payload, null, 2).substring(0, 300)}...
                    </pre>
                  </div>

                  {item.nextAttempt && (
                    <p className="text-xs text-gray-600">
                      Next attempt: {new Date(item.nextAttempt).toLocaleString()}
                    </p>
                  )}
                </div>
              ))}
            </div>

            <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 p-4 flex gap-2">
              <button
                onClick={handleRetryFailed}
                disabled={isRetrying}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
              >
                <RefreshCw className={`w-4 h-4 ${isRetrying ? 'animate-spin' : ''}`} />
                Retry All
              </button>
              <button
                onClick={() => setShowFailedPanel(false)}
                className="flex-1 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-900 rounded-lg font-medium transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Conflicts Details Panel */}
      {showConflictPanel && conflicts.length > 0 && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">Data Conflicts</h2>
              <button
                onClick={() => setShowConflictPanel(false)}
                className="p-1 hover:bg-gray-100 rounded transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-3">
              {conflicts.map(conflict => (
                <div key={conflict.id} className="border border-gray-200 rounded-lg p-3 bg-yellow-50">
                  <div className="mb-2">
                    <p className="font-semibold text-gray-900">{conflict.entityType} - {conflict.entityId}</p>
                    <p className="text-xs text-gray-500">Resolution: <span className="font-medium">{conflict.strategy.toUpperCase()}</span></p>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-2 bg-green-50 border border-green-200 rounded">
                      <p className="text-xs font-semibold text-green-800 mb-1">✓ Your Version (Applied)</p>
                      <pre className="font-mono text-xs text-green-700 whitespace-pre-wrap break-words max-h-24 overflow-y-auto">
                        {JSON.stringify(conflict.localVersion, null, 2).substring(0, 200)}...
                      </pre>
                    </div>

                    <div className="p-2 bg-red-50 border border-red-200 rounded">
                      <p className="text-xs font-semibold text-red-800 mb-1">✕ Remote Version</p>
                      <pre className="font-mono text-xs text-red-700 whitespace-pre-wrap break-words max-h-24 overflow-y-auto">
                        {JSON.stringify(conflict.remoteVersion, null, 2).substring(0, 200)}...
                      </pre>
                    </div>
                  </div>

                  <p className="text-xs text-yellow-700 mt-2">
                    Timestamp: {new Date(conflict.timestamp).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>

            <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 p-4">
              <button
                onClick={() => setShowConflictPanel(false)}
                className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
