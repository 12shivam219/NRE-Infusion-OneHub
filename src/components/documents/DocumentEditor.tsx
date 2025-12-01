import { useEffect, useRef, useState, useMemo } from 'react';
import { X, Download, Loader } from 'lucide-react';
import '@harbour-enterprises/superdoc/style.css';
import { SuperDoc } from '@harbour-enterprises/superdoc';
import type { Database } from '../../lib/database.types';
import { useToast } from '../../contexts/ToastContext';
import { downloadDocument } from '../../lib/api/documents';

type Document = Database['public']['Tables']['documents']['Row'];

interface DocumentEditorProps {
  documents: Document[];
  layout: 'single' | '2x2' | '3x3';
  onClose: () => void;
  onSave?: (documents: Document[]) => Promise<void>;
}

// Blob cache using IndexedDB for fast re-access
const CACHE_DB_NAME = 'DocumentEditorCache';
const CACHE_STORE_NAME = 'blobs';

const openCacheDB = async () => {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const req = indexedDB.open(CACHE_DB_NAME, 1);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve(req.result);
    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(CACHE_STORE_NAME)) {
        db.createObjectStore(CACHE_STORE_NAME, { keyPath: 'storagePath' });
      }
    };
  });
};

const getCachedBlob = async (storagePath: string): Promise<Blob | null> => {
  try {
    const db = await openCacheDB();
    return new Promise((resolve) => {
      const tx = db.transaction(CACHE_STORE_NAME, 'readonly');
      const req = tx.objectStore(CACHE_STORE_NAME).get(storagePath);
      req.onsuccess = () => {
        const cached = req.result;
        if (cached) {
          console.log(`Cache HIT: ${storagePath}`);
          resolve(cached.blob);
        } else {
          resolve(null);
        }
      };
      req.onerror = () => resolve(null);
    });
  } catch (error) {
    console.warn('Cache retrieval failed:', error);
    return null;
  }
};

const setCachedBlob = async (storagePath: string, blob: Blob) => {
  try {
    const db = await openCacheDB();
    const tx = db.transaction(CACHE_STORE_NAME, 'readwrite');
    tx.objectStore(CACHE_STORE_NAME).put({ storagePath, blob, timestamp: Date.now() });
  } catch (error) {
    console.warn('Cache storage failed:', error);
  }
};

export const DocumentEditor = ({ documents, layout, onClose, onSave }: DocumentEditorProps) => {
  const { showToast } = useToast();
  const superdocInstances = useRef<SuperDoc[]>([]);
  const editedDocsRef = useRef<Map<string, boolean>>(new Map());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editedCount, setEditedCount] = useState(0);
  const [documentBlobs, setDocumentBlobs] = useState<(Blob | null)[]>([]);
  const [loadProgress, setLoadProgress] = useState(0);

  // Determine grid layout
  const getGridClass = () => {
    switch (layout) {
      case 'single':
        return 'grid-cols-1';
      case '2x2':
        return 'grid-cols-2';
      case '3x3':
        return 'grid-cols-3';
    }
  };

  const getMaxDocuments = () => {
    switch (layout) {
      case 'single':
        return 1;
      case '2x2':
        return 4;
      case '3x3':
        return 9;
    }
  };

  const documentsToDisplay = useMemo(() => documents.slice(0, getMaxDocuments()), [documents, layout]);

  // Phase 1: Load document blobs MUCH FASTER with parallel fetching and caching
  useEffect(() => {
    let isMounted = true;

    const loadDocuments = async () => {
      try {
        const blobs: (Blob | null)[] = new Array(documentsToDisplay.length).fill(null);
        let loadedCount = 0;

        // Load all documents in PARALLEL (much faster than sequential)
        const loadPromises = documentsToDisplay.map(async (doc, index) => {
          try {
            console.log(`[${index + 1}/${documentsToDisplay.length}] Loading: ${doc.original_filename}`);

            // SPEED OPTIMIZATION 1: Check cache first (instant if cached)
            let blob = await getCachedBlob(doc.storage_path);

            if (!blob) {
              // SPEED OPTIMIZATION 2: Download with timeout
              const controller = new AbortController();
              const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

              // Get download URL from API
              const result = await downloadDocument(doc.storage_path);

              if (!result.success || !result.url) {
                clearTimeout(timeoutId);
                console.warn(`Download URL failed for ${doc.original_filename}`);
                blobs[index] = null;
                return;
              }

              try {
                // Fetch the document with timeout and streaming
                const response = await fetch(result.url, { signal: controller.signal });
                clearTimeout(timeoutId);

                if (!response.ok) {
                  throw new Error(`HTTP ${response.status}`);
                }

                blob = await response.blob();
                console.log(`✓ Loaded: ${doc.original_filename} (${(blob.size / 1024).toFixed(2)} KB)`);

                // Cache for next time
                await setCachedBlob(doc.storage_path, blob);
              } catch (error) {
                clearTimeout(timeoutId);
                throw error;
              }
            }

            blobs[index] = blob;
          } catch (error) {
            console.error(`Error loading ${doc.original_filename}:`, error);
            if (isMounted) {
              showToast({
                type: 'error',
                title: 'Failed to load document',
                message: `${doc.original_filename}`,
              });
            }
            blobs[index] = null;
          } finally {
            loadedCount++;
            if (isMounted) {
              setLoadProgress((loadedCount / documentsToDisplay.length) * 100);
            }
          }
        });

        // Wait for all parallel loads to complete
        await Promise.allSettled(loadPromises);

        if (isMounted) {
          setDocumentBlobs(blobs);
        }
      } catch (error) {
        console.error('Error in load phase:', error);
        if (isMounted) {
          showToast({
            type: 'error',
            title: 'Load failed',
            message: 'Failed to load documents',
          });
        }
      }
    };

    loadDocuments();

    return () => {
      isMounted = false;
    };
  }, [documentsToDisplay, showToast]);

  // Phase 2: Signal that DOM should be rendered (hide loading spinner)
  useEffect(() => {
    if (documentBlobs.length > 0) {
      console.log('Document blobs loaded, rendering DOM...');
      setLoading(false);
    }
  }, [documentBlobs.length]);

  // Phase 3: Initialize SuperDoc editors AFTER DOM is rendered - OPTIMIZED for speed
  useEffect(() => {
    let isMounted = true;

    const initializeEditors = async () => {
      try {
        // SPEED OPTIMIZATION: Reduced wait time from 200ms to just 50ms
        // React's batching usually completes DOM commit within 16ms
        await new Promise(resolve => setTimeout(resolve, 50));

        if (!isMounted) return;

        console.log(`Phase 3: Initializing SuperDoc for ${documentsToDisplay.length} document(s)...`);

        // SPEED OPTIMIZATION: Parallel initialization instead of sequential
        const initPromises = documentsToDisplay.map(async (doc, i) => {
          if (!isMounted) return;

          // Skip if already initialized
          if (superdocInstances.current[i]) {
            return;
          }

          const blob = documentBlobs[i];
          if (!blob) {
            return;
          }

          try {
            const selector = `#superdoc-container-${i}`;
            const toolbarSelector = `#superdoc-toolbar-${i}`;

            // Query DOM elements (quick operation)
            const container = document.querySelector(selector);
            const toolbar = document.querySelector(toolbarSelector);

            if (!container || !toolbar) {
              console.error(`DOM elements missing for ${doc.original_filename}`);
              return;
            }

            console.log(`Initializing: ${doc.original_filename}`);

            // SPEED OPTIMIZATION: Initialize SuperDoc with minimal settings
            const superdoc = new SuperDoc({
              selector,
              toolbar: toolbarSelector,
              document: blob,
              documentMode: 'editing',
              pagination: false, // Disable pagination for faster initial load
              rulers: false, // Disable rulers for faster initial load
            });

            // Track changes
            superdoc.on('editor-update', () => {
              if (isMounted) {
                editedDocsRef.current.set(doc.id, true);
                setEditedCount(editedDocsRef.current.size);
              }
            });

            superdoc.on('ready', () => {
              console.log(`✓ Ready: ${doc.original_filename}`);
            });

            superdocInstances.current[i] = superdoc;
          } catch (error) {
            console.error(`Init failed for ${doc.original_filename}:`, error);
            if (isMounted) {
              showToast({
                type: 'error',
                title: 'Editor failed',
                message: doc.original_filename,
              });
            }
          }
        });

        // SPEED OPTIMIZATION: Use Promise.allSettled for robust parallel execution
        await Promise.allSettled(initPromises);

        if (isMounted) {
          console.log('✓ All editors initialized');
        }
      } catch (error) {
        console.error('Init error:', error);
      }
    };

    // Only initialize if we have document blobs AND loading is complete
    if (documentBlobs.length > 0 && !loading) {
      initializeEditors();
    }

    return () => {
      isMounted = false;
      // Cleanup on unmount
      superdocInstances.current.forEach((instance) => {
        try {
          instance?.destroy?.();
        } catch (e) {
          // Silent fail on cleanup
        }
      });
      superdocInstances.current = [];
    };
  }, [documentBlobs.length, documentsToDisplay.length, loading]);

  const handleDownloadEdited = async (index: number) => {
    try {
      const doc = documentsToDisplay[index];
      const instance = superdocInstances.current[index];

      if (!instance) {
        showToast({
          type: 'error',
          title: 'Download failed',
          message: 'Editor instance not available',
        });
        return;
      }

      // Get the edited document as blob
      const blob = await (instance.export as (options?: unknown) => Promise<Blob | void>)({
        isFinalDoc: true,
      });

      if (!blob) {
        showToast({
          type: 'error',
          title: 'Export failed',
          message: 'Could not export document',
        });
        return;
      }

      // Create download link
      const url = URL.createObjectURL(blob as Blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = doc.original_filename || 'document.docx';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      showToast({
        type: 'success',
        title: 'Download successful',
        message: `${doc.original_filename} has been downloaded`,
      });
    } catch (error) {
      console.error('Error downloading document:', error);
      showToast({
        type: 'error',
        title: 'Download failed',
        message: 'Failed to download the edited document',
      });
    }
  };

  const handleSaveAll = async () => {
    try {
      setSaving(true);

      // Export all edited documents
      const allEdited = Array.from(editedDocsRef.current.entries()).filter(([, isEdited]) => isEdited);

      if (allEdited.length === 0) {
        showToast({
          type: 'info',
          title: 'No changes',
          message: 'No documents were edited',
        });
        setSaving(false);
        return;
      }

      // Export and download each edited document
      for (let i = 0; i < documentsToDisplay.length; i++) {
        const doc = documentsToDisplay[i];
        if (!allEdited.some(([docId]) => docId === doc.id)) continue;

        const instance = superdocInstances.current[i];
        if (!instance) continue;

        try {
          const blob = await (instance.export as (options?: unknown) => Promise<Blob | void>)({
            isFinalDoc: true,
          });

          if (blob) {
            const url = URL.createObjectURL(blob as Blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = doc.original_filename || 'document.docx';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
          }
        } catch (error) {
          console.error(`Error exporting ${doc.original_filename}:`, error);
        }
      }

      showToast({
        type: 'success',
        title: 'Documents saved',
        message: `${allEdited.length} document(s) downloaded`,
      });

      if (onSave) {
        await onSave(documentsToDisplay);
      }

      setTimeout(() => {
        onClose();
      }, 500);
    } catch (error) {
      console.error('Error saving documents:', error);
      showToast({
        type: 'error',
        title: 'Save failed',
        message: 'Failed to save documents',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg w-full h-full max-h-screen max-w-7xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 flex-shrink-0">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Document Editor</h2>
            <p className="text-sm text-gray-600">
              Editing {documentsToDisplay.length} document{documentsToDisplay.length > 1 ? 's' : ''}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition"
            title="Close editor"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Editor Content */}
        <div className="flex-1 overflow-hidden p-4">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <Loader className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-3" />
                <p className="text-gray-700 font-medium mb-2">Opening documents...</p>
                <p className="text-sm text-gray-500">
                  {loadProgress > 0 ? `Loading ${Math.round(loadProgress)}%` : 'Preparing editors...'}
                </p>
                {loadProgress > 0 && (
                  <div className="w-48 h-1 bg-gray-200 rounded-full mx-auto mt-3 overflow-hidden">
                    <div
                      className="h-full bg-blue-600 transition-all duration-300"
                      style={{ width: `${loadProgress}%` }}
                    />
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className={`grid ${getGridClass()} gap-4 h-full overflow-auto`}>
              {documentsToDisplay.map((doc, index) => (
                <div
                  key={doc.id}
                  className="bg-white border border-gray-300 rounded-lg flex flex-col overflow-hidden h-full"
                >
                  {/* Document Header */}
                  <div className="flex items-center justify-between p-3 border-b border-gray-200 bg-gray-50 flex-shrink-0">
                    <div className="min-w-0">
                      <h3 className="text-sm font-semibold text-gray-900 truncate">
                        {doc.original_filename}
                      </h3>
                      <p className="text-xs text-gray-500">Version {doc.version}</p>
                    </div>
                    <button
                      onClick={() => handleDownloadEdited(index)}
                      className="p-2 text-gray-600 hover:bg-gray-200 rounded transition flex-shrink-0 ml-2"
                      title="Download this document"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Toolbar */}
                  <div
                    id={`superdoc-toolbar-${index}`}
                    className="bg-white border-b border-gray-200 overflow-x-auto flex-shrink-0"
                  />

                  {/* Editor Container */}
                  <div
                    id={`superdoc-container-${index}`}
                    className="flex-1 overflow-auto min-h-[400px]"
                    style={{ minHeight: '400px' }}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-gray-200 bg-gray-50 flex-shrink-0">
          <p className="text-sm text-gray-600">
            {editedCount > 0 ? (
              <>
                <span className="font-semibold">{editedCount}</span> document
                {editedCount > 1 ? 's' : ''} modified
              </>
            ) : (
              'No changes made'
            )}
          </p>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg font-medium hover:bg-gray-100 transition disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveAll}
              disabled={saving || editedCount === 0}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition disabled:opacity-50 flex items-center gap-2"
            >
              {saving && <Loader className="w-4 h-4 animate-spin" />}
              {saving ? 'Saving...' : `Save & Download (${editedCount})`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
