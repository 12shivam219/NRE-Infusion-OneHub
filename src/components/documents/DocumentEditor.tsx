import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { X, Download, Loader, AlertCircle } from 'lucide-react';
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

// Memory management utilities
const getDeviceMemoryGB = (): number => {
  // Check for deviceMemory API (Chrome 63+)
  const nav = navigator as { deviceMemory?: number };
  if (nav.deviceMemory) {
    return nav.deviceMemory;
  }
  // Fallback: assume 4GB for unknown devices
  return 4;
};

const isLowMemoryDevice = (): boolean => {
  return getDeviceMemoryGB() < 4;
};

// Blob cache using IndexedDB for fast re-access
const CACHE_DB_NAME = 'DocumentEditorCache';
const CACHE_STORE_NAME = 'blobs';
const VERSION_STORE_NAME = 'versions';
const AUTO_SAVE_INTERVAL = 30000; // Auto-save every 30 seconds
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB max file size

const getDocumentType = (doc: Document): 'docx' | 'doc' | 'pdf' => {
  const filename = doc.original_filename?.toLowerCase() || '';

  if (doc.mime_type === 'application/pdf' || filename.endsWith('.pdf')) {
    return 'pdf';
  }

  if (doc.mime_type === 'application/msword' || filename.endsWith('.doc')) {
    return 'doc';
  }

  return 'docx';
};

const isPdfDocument = (doc: Document) => getDocumentType(doc) === 'pdf';

const openCacheDB = async () => {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const req = indexedDB.open(CACHE_DB_NAME, 2); // Bumped version for new store
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve(req.result);
    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(CACHE_STORE_NAME)) {
        db.createObjectStore(CACHE_STORE_NAME, { keyPath: 'storagePath' });
      }
      if (!db.objectStoreNames.contains(VERSION_STORE_NAME)) {
        db.createObjectStore(VERSION_STORE_NAME, { keyPath: 'id', autoIncrement: true });
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

/** Clear old cached blobs (keep only recent ones) - helps with memory management on unmount */
const pruneOldCache = async (maxAgeMs = 24 * 60 * 60 * 1000) => {
  try {
    const db = await openCacheDB();
    const tx = db.transaction(CACHE_STORE_NAME, 'readwrite');
    const store = tx.objectStore(CACHE_STORE_NAME);
    const now = Date.now();
    const cutoffTime = now - maxAgeMs;

    const request = store.openCursor();
    request.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest).result;
      if (cursor) {
        if (cursor.value.timestamp < cutoffTime) {
          cursor.delete();
          console.log(`Pruned old cache: ${cursor.value.storagePath}`);
        }
        cursor.continue();
      }
    };
  } catch (error) {
    console.warn('Cache pruning failed:', error);
  }
};

/** Save document version for history */
const saveDocumentVersion = async (docId: string, filename: string, blob: Blob, versionNumber: number) => {
  try {
    const db = await openCacheDB();
    const tx = db.transaction(VERSION_STORE_NAME, 'readwrite');
    tx.objectStore(VERSION_STORE_NAME).add({
      docId,
      filename,
      blob,
      versionNumber,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.warn('Version save failed:', error);
  }
};

/** Fetch with exponential backoff retry */
const fetchWithRetry = async (
  url: string,
  signal?: AbortSignal,
  maxRetries = 3,
  baseDelay = 1000
): Promise<Response> => {
  let lastError: Error | null = null;

  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url, { signal });
      if (response.ok) return response;
      
      if (response.status >= 500 || response.status === 429) {
        // Retry on server errors and rate limit
        lastError = new Error(`HTTP ${response.status}`);
      } else {
        // Don't retry on client errors
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      lastError = error as Error;
      if (i < maxRetries - 1 && !signal?.aborted) {
        const delay = baseDelay * Math.pow(2, i);
        console.log(`Retry ${i + 1}/${maxRetries} after ${delay}ms`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError || new Error('Max retries exceeded');
};

export const DocumentEditor = ({ documents, layout, onClose, onSave }: DocumentEditorProps) => {
  const { showToast } = useToast();
  const superdocInstances = useRef<SuperDoc[]>([]);
  const editedDocsRef = useRef<Map<string, boolean>>(new Map());
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastAutoSaveRef = useRef<Map<string, number>>(new Map()); // Track last save time per doc
  const cleanupTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editedCount, setEditedCount] = useState(0);
  const [documentBlobs, setDocumentBlobs] = useState<(Blob | null)[]>([]);
  const [loadProgress, setLoadProgress] = useState(0);
  const [showConfirmClose, setShowConfirmClose] = useState(false);
  const [fileSizeError, setFileSizeError] = useState<string | null>(null);
  const [pdfUrls, setPdfUrls] = useState<Record<string, string>>({});
  const [memoryWarning, setMemoryWarning] = useState<string | null>(null);

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

  const getMaxDocuments = useCallback(() => {
    switch (layout) {
      case 'single':
        return 1;
      case '2x2':
        return 4;
      case '3x3':
        return 9;
    }
  }, [layout]);

  const documentsToDisplay = useMemo(() => documents.slice(0, getMaxDocuments()), [documents, getMaxDocuments]);

  // MEMORY WARNING EFFECT: Alert user about memory constraints on low-end devices
  useEffect(() => {
    const deviceMemory = getDeviceMemoryGB();
    const isLowMemory = isLowMemoryDevice();
    const estimatedMemoryUsage = documentsToDisplay.length * 5; // ~5MB per document

    if (isLowMemory) {
      const warningMsg = `Low-memory device detected (${deviceMemory}GB). Estimated memory usage: ~${estimatedMemoryUsage}MB. The editor will auto-save and clean up aggressively.`;
      console.warn('⚠️', warningMsg);
      setMemoryWarning(warningMsg);

      showToast({
        type: 'info',
        title: 'Low Memory Warning',
        message: `This device has limited memory (${deviceMemory}GB). Auto-saving is enabled to prevent data loss.`,
      });
    } else if (estimatedMemoryUsage > deviceMemory * 0.5) {
      const warningMsg = `High memory usage anticipated: ${estimatedMemoryUsage}MB on a ${deviceMemory}GB device.`;
      console.warn('⚠️', warningMsg);
      setMemoryWarning(warningMsg);
    }
  }, [documentsToDisplay.length, showToast]);

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
              // Check file size from document metadata
              if (doc.file_size > MAX_FILE_SIZE) {
                const errorMsg = `File too large: ${(doc.file_size / 1024 / 1024).toFixed(2)}MB (max 5MB)`;
                console.warn(errorMsg);
                if (isMounted) {
                  setFileSizeError(`${doc.original_filename}: ${errorMsg}`);
                }
                blobs[index] = null;
                loadedCount++;
                return;
              }

              // SPEED OPTIMIZATION 2: Download with timeout and retry logic
              const controller = new AbortController();
              const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

              // Get download URL from API
              const result = await downloadDocument(doc.storage_path);

              if (!result.success || !result.url) {
                clearTimeout(timeoutId);
                console.warn(`Download URL failed for ${doc.original_filename}`);
                blobs[index] = null;
                loadedCount++;
                return;
              }

              try {
                // Fetch the document with retry logic
                const response = await fetchWithRetry(result.url, controller.signal);
                clearTimeout(timeoutId);

                blob = await response.blob();

                // Verify blob size
                // Verify blob size
                if (blob.size > MAX_FILE_SIZE) {
                  const errorMsg = `Downloaded file too large: ${(blob.size / 1024 / 1024).toFixed(2)}MB`;
                  console.warn(errorMsg);
                  if (isMounted) {
                    setFileSizeError(`${doc.original_filename}: ${errorMsg}`);
                  }
                  blobs[index] = null;
                  loadedCount++;
                  return;
                }
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
                message: `${doc.original_filename}: ${error instanceof Error ? error.message : 'Unknown error'}`,
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
    if (documentBlobs.length > 0 && loading) {
      console.log('Document blobs loaded, rendering DOM...');
      console.log('Blobs count:', documentBlobs.length);
      setLoading(false);
    }
  }, [documentBlobs.length, loading]);

  // Manage PDF object URLs for preview mode
  useEffect(() => {
    const newUrls: Record<string, string> = {};

    documentsToDisplay.forEach((doc, index) => {
      if (!isPdfDocument(doc)) return;
      const blob = documentBlobs[index];
      if (!blob) return;
      newUrls[doc.id] = URL.createObjectURL(blob);
    });

    setPdfUrls((prev) => {
      Object.entries(prev).forEach(([docId, url]) => {
        if (!newUrls[docId]) {
          URL.revokeObjectURL(url);
        }
      });
      return newUrls;
    });

    return () => {
      Object.values(newUrls).forEach((url) => URL.revokeObjectURL(url));
    };
  }, [documentsToDisplay, documentBlobs]);

  // Auto-save effect: Save document state periodically
  useEffect(() => {
    if (loading || editedCount === 0) return;

    const performAutoSave = async () => {
      try {
        console.log('🔄 Auto-saving documents...');
        
        for (let i = 0; i < documentsToDisplay.length; i++) {
          const doc = documentsToDisplay[i];
          const instance = superdocInstances.current[i];

          if (!instance || !editedDocsRef.current.get(doc.id)) {
            continue;
          }

          try {
            // Export current document state
            const blob = await (instance.export as (options?: unknown) => Promise<Blob | void>)({
              isFinalDoc: false, // Export with tracked changes visible
            });

            if (blob) {
              // Save to version history
              const versionNumber = (doc.version || 0) + 1;
              await saveDocumentVersion(doc.id, doc.original_filename, blob as Blob, versionNumber);
              
              // Track auto-save time
              lastAutoSaveRef.current.set(doc.id, Date.now());
              
              console.log(`✓ Auto-saved: ${doc.original_filename} (v${versionNumber})`);
            }
          } catch (error) {
            console.warn(`Auto-save failed for ${doc.original_filename}:`, error);
          }
        }

        showToast({
          type: 'success',
          title: 'Auto-saved',
          message: `${editedCount} document(s) auto-saved to version history`,
        });
      } catch (error) {
        console.error('Auto-save error:', error);
      }
    };

    // Clear existing timer
    if (autoSaveTimerRef.current) {
      clearInterval(autoSaveTimerRef.current);
    }

    // Set new timer
    autoSaveTimerRef.current = setInterval(performAutoSave, AUTO_SAVE_INTERVAL);

    return () => {
      if (autoSaveTimerRef.current) {
        clearInterval(autoSaveTimerRef.current);
      }
    };
  }, [loading, editedCount, documentsToDisplay, showToast]);

  // AGGRESSIVE MEMORY CLEANUP: Clear blobs and resources when component unmounts or docs change
  useEffect(() => {
    // Capture refs in the effect body to avoid stale warnings
    const editedDocsMap = editedDocsRef.current;
    const lastSavesMap = lastAutoSaveRef.current;
    const superdocRefs = superdocInstances.current;
    
    return () => {
      console.log('🧹 DocumentEditor unmounting - aggressive cleanup starting...');

      // 1. Immediately clear all SuperDoc instances
      superdocRefs.forEach((instance: SuperDoc | undefined, i: number) => {
        try {
          instance?.destroy?.();
          console.log(`Destroyed SuperDoc instance ${i}`);
        } catch (error) {
          console.error(`Error destroying SuperDoc instance ${i}:`, error);
        }
      });
      superdocInstances.current = [];
      
      // Clear Maps
      editedDocsMap?.clear();
      lastSavesMap?.clear();

      // 2. Clear all state holding blobs (force garbage collection)
      setDocumentBlobs([]);
      setEditedCount(0);

      // 3. Revoke all PDF object URLs immediately
      Object.values(pdfUrls).forEach((url) => {
        try {
          URL.revokeObjectURL(url);
          console.log(`Revoked object URL: ${url}`);
        } catch (error) {
          console.error('Error revoking object URL:', error);
        }
      });
      setPdfUrls({});

      // 4. Clear auto-save timer
      if (autoSaveTimerRef.current) {
        clearInterval(autoSaveTimerRef.current);
        autoSaveTimerRef.current = null;
      }

      // 5. Clear cleanup timeout if pending
      if (cleanupTimeoutRef.current) {
        clearTimeout(cleanupTimeoutRef.current);
        cleanupTimeoutRef.current = null;
      }

      // 6. Async cleanup of IndexedDB cache (non-blocking)
      cleanupTimeoutRef.current = setTimeout(async () => {
        try {
          // Prune old cache entries (>24 hours)
          await pruneOldCache(24 * 60 * 60 * 1000);
          console.log('✓ Cache pruned successfully');
        } catch (error) {
          console.error('Error pruning cache:', error);
        }
      }, 100);

      console.log('✓ Memory cleanup complete');
    };
  }, [pdfUrls]);

  // Phase 3: Initialize SuperDoc editors AFTER DOM is rendered - OPTIMIZED for speed
  useEffect(() => {
    let isMounted = true;

    const initializeEditors = async () => {
      try {
        // Wait for DOM to be fully rendered and painted
        // 50ms minimum for React batching, but browsers need ~16ms per frame
        // 100ms gives us 6 frames at 60fps to ensure layout is complete
        await new Promise(resolve => setTimeout(resolve, 100));

        if (!isMounted) return;

        console.log(`Phase 3: Initializing SuperDoc for ${documentsToDisplay.length} document(s)...`);

        // SPEED OPTIMIZATION: Parallel initialization instead of sequential
        const initPromises = documentsToDisplay.map(async (doc: Document, i: number) => {
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
            const docType = getDocumentType(doc);

            if (docType === 'pdf') {
              console.log(`PDF preview mode enabled for ${doc.original_filename}`);
              return;
            }

            const selector = `#superdoc-container-${i}`;
            const toolbarSelector = `#superdoc-toolbar-${i}`;

            // Query DOM elements (quick operation)
            const container = document.querySelector(selector);
            const toolbar = document.querySelector(toolbarSelector);

            if (!container || !toolbar) {
              console.error(`DOM elements missing for ${doc.original_filename}. Selector: ${selector}`);
              console.log('Container:', container);
              console.log('Toolbar:', toolbar);
              return;
            }

            console.log(`Initializing: ${doc.original_filename}`);

            // Convert blob to File object (SuperDoc requires File, not just Blob)
            const file = new File([blob], doc.original_filename, { type: blob.type });

            console.log(`Document type detected: ${docType}`);
            console.log(`File type/MIME: ${file.type}`);
            console.log(`File size: ${file.size} bytes`);

            // SPEED OPTIMIZATION: Initialize SuperDoc with minimal settings
            const superdoc = new SuperDoc({
              selector,
              toolbar: toolbarSelector,
              documents: [
                {
                  id: `doc-${doc.id}`,
                  type: docType,  // Use detected type instead of hardcoded 'docx'
                  data: file,
                },
              ],
              documentMode: 'editing',
              pagination: false, // Disable pagination for faster initial load
              rulers: false, // Disable rulers for faster initial load
            });

            console.log(`SuperDoc instance created for ${doc.original_filename}`);

            // Track changes
            superdoc.on('editor-update', () => {
              if (isMounted) {
                editedDocsRef.current.set(doc.id, true);
                setEditedCount(editedDocsRef.current.size);
              }
            });

            superdoc.on('ready', () => {
              console.log(`✓ Ready: ${doc.original_filename}`);
              // Force visibility of containers
              const container = document.querySelector(selector) as HTMLElement;
              if (container) {
                container.style.visibility = 'visible';
                container.style.opacity = '1';
              }
            });

            // Handle initialization errors
            superdoc.on('error', (err: Error) => {
              console.error(`SuperDoc error for ${doc.original_filename}:`, err);
              console.error('Error details:', err.message, err.stack);
              if (isMounted) {
                showToast({
                  type: 'error',
                  title: 'Editor failed to load',
                  message: doc.original_filename,
                });
              }
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
          // Force hide loading after initialization completes
          setLoading(false);
        }
      } catch (error) {
        console.error('Init error:', error);
      }
    };

    // Only initialize if we have document blobs AND loading is false (DOM is rendered)
    if (documentBlobs.length > 0 && !loading) {
      initializeEditors();
    }

    return () => {
      isMounted = false;
      // Cleanup on unmount
      superdocInstances.current.forEach((instance: SuperDoc | undefined) => {
        try {
          instance?.destroy?.();
        } catch {
          // Silent fail on cleanup
        }
      });
      superdocInstances.current = [];
    };
  }, [documentBlobs, documentsToDisplay, loading, showToast]);

  const handleCloseWithConfirm = useCallback(() => {
    if (editedCount > 0 && !showConfirmClose) {
      setShowConfirmClose(true);
    } else {
      onClose();
    }
  }, [editedCount, showConfirmClose, onClose]);

  const handleDownloadEdited = async (index: number) => {
    try {
      const doc = documentsToDisplay[index];
      const instance = superdocInstances.current[index];

      if (isPdfDocument(doc)) {
        const blob = documentBlobs[index];

        if (!blob) {
          showToast({
            type: 'error',
            title: 'Download failed',
            message: 'PDF data is not available for download',
          });
          return;
        }

        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = doc.original_filename || 'document.pdf';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        showToast({
          type: 'success',
          title: 'Download successful',
          message: `${doc.original_filename} has been downloaded`,
        });
        return;
      }

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

      const editedEntries = documentsToDisplay
        .map((doc, index) => ({ doc, index, instance: superdocInstances.current[index] }))
        .filter(({ doc, instance }) => !!instance && !isPdfDocument(doc) && editedDocsRef.current.get(doc.id));

      if (editedEntries.length === 0) {
        showToast({
          type: 'info',
          title: 'No changes',
          message: 'No documents were edited',
        });
        return;
      }

      for (const { doc, instance } of editedEntries) {
        try {
          const blob = await (instance!.export as (options?: unknown) => Promise<Blob | void>)({
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
        message: `${editedEntries.length} document(s) downloaded`,
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
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg w-full h-full max-h-screen max-w-7xl flex flex-col">
          <div className="flex items-center justify-between p-4 border-b border-gray-200 flex-shrink-0">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Document Editor</h2>
              <p className="text-sm text-gray-600">
                Editing {documentsToDisplay.length} document{documentsToDisplay.length > 1 ? 's' : ''}
              </p>
            </div>
            <button
              onClick={handleCloseWithConfirm}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition"
              title="Close editor"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {fileSizeError && (
            <div className="mx-4 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-red-900">File Size Error</p>
                <p className="text-sm text-red-700">{fileSizeError}</p>
                <p className="text-xs text-red-600 mt-1">Maximum file size: 5MB</p>
              </div>
              <button
                onClick={() => setFileSizeError(null)}
                className="ml-auto text-red-500 hover:text-red-700"
              >
                ✕
              </button>
            </div>
          )}

          {memoryWarning && (
            <div className="mx-4 mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-yellow-900">Memory Usage Warning</p>
                <p className="text-sm text-yellow-700">{memoryWarning}</p>
              </div>
              <button
                onClick={() => setMemoryWarning(null)}
                className="ml-auto text-yellow-500 hover:text-yellow-700"
              >
                ✕
              </button>
            </div>
          )}

          <div className="flex-1 overflow-hidden p-4">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <Loader className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-3" />
                  <p className="text-gray-700 font-medium mb-2">Opening documents...</p>
                  <p className="text-sm text-gray-500">
                    {loadProgress > 0 ? `Loading ${Math.round(loadProgress)}%` : 'Preparing editors'}
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
                {documentsToDisplay.map((doc, index) => {
                  const isPdf = isPdfDocument(doc);

                  return (
                    <div
                      key={doc.id}
                      className="flex flex-col bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden"
                    >
                      <div className="flex items-center justify-between p-3 border-b border-gray-200 bg-gray-50 flex-shrink-0">
                        <div className="min-w-0">
                          <h3 className="text-sm font-semibold text-gray-900 truncate">{doc.original_filename}</h3>
                          <p className="text-xs text-gray-500">Version {doc.version}</p>
                          {isPdf && (
                            <p className="mt-1 text-xs font-medium text-blue-600">PDF preview – editing disabled</p>
                          )}
                        </div>
                        <button
                          onClick={() => handleDownloadEdited(index)}
                          className="p-2 text-gray-600 hover:bg-gray-200 rounded transition flex-shrink-0 ml-2"
                          title="Download this document"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                      </div>

                      {!isPdf && (
                        <div
                          id={`superdoc-toolbar-${index}`}
                          className="bg-white border-b border-gray-200 overflow-x-auto flex-shrink-0"
                        />
                      )}

                      {isPdf ? (
                        <div className="flex-1 overflow-auto min-h-[400px] flex items-center justify-center bg-gray-50">
                          {pdfUrls[doc.id] ? (
                            <iframe
                              title={`PDF preview for ${doc.original_filename}`}
                              src={pdfUrls[doc.id]}
                              className="w-full h-full"
                              style={{ minHeight: '400px' }}
                            />
                          ) : (
                            <div className="text-gray-500 text-sm">Preparing PDF preview...</div>
                          )}
                        </div>
                      ) : (
                        <div
                          id={`superdoc-container-${index}`}
                            className="flex-1 overflow-auto min-h-[400px] bg-white shadow-lg rounded-lg"
                            style={{ minHeight: '400px', maxWidth: '850px' }}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 border-t border-gray-200 bg-gray-50 flex-shrink-0">
            <p className="text-sm text-gray-600">
              {editedCount > 0 ? (
                <>
                  <span className="font-semibold">{editedCount}</span> document
                  {editedCount > 1 ? 's' : ''}
                </>
              ) : (
                'No changes made'
              )}
            </p>
            <div className="flex gap-3 w-full sm:w-auto">
              <button
                onClick={handleCloseWithConfirm}
                disabled={saving}
                className="flex-1 sm:flex-none px-4 py-2 text-gray-700 border border-gray-300 rounded-lg font-medium hover:bg-gray-100 transition disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveAll}
                disabled={saving || editedCount === 0}
                className="flex-1 sm:flex-none px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {saving && <Loader className="w-4 h-4 animate-spin" />}
                {saving ? 'Saving...' : `Save & Download (${editedCount})`}
              </button>
            </div>
          </div>
        </div>
      </div>

      {showConfirmClose && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Unsaved Changes</h3>
            <p className="text-gray-600 mb-6">
              You have <span className="font-semibold">{editedCount}</span> document
              {editedCount !== 1 ? 's' : ''} with unsaved changes.
              Your changes have been auto-saved to version history, but if you close without downloading, you may need to re-edit them.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowConfirmClose(false)}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg font-medium hover:bg-gray-100 transition"
              >
                Keep Editing
              </button>
              <button
                onClick={() => {
                  setShowConfirmClose(false);
                  onClose();
                }}
                className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition"
              >
                Close Anyway
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};