import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, Download, AlertCircle } from 'lucide-react';
import JSZip from 'jszip';
import { LogoLoader } from '../common/LogoLoader';
import type { Database } from '../../lib/database.types';
import { useToast } from '../../contexts/ToastContext';
import { downloadDocument, updateDocument, saveDocumentToApp, saveDocumentToAppFolder } from '../../lib/api/documents';
import { useAuth } from '../../hooks/useAuth';
import { DownloadOptionsModal } from './DownloadOptionsModal';
import { repairDocxStructure, logRepairResult } from '../../lib/docxRepair';
// Note: SuperDoc is lazy-loaded inside the editor init to avoid heavy startup cost

type Document = Database['public']['Tables']['documents']['Row'];

// Type definition for SuperDoc library
interface SuperDoc {
  export(options?: unknown): Promise<Blob | void>;
  on(event: string, callback: (err?: Error) => void): void;
  destroy(): void;
}

interface DocumentEditorProps {
  documents: Document[];
  layout: 'single' | '2x2' | '3x3';
  onClose: () => void;
  onSave?: (documents: Document[]) => Promise<void>;
}

// Blob cache using IndexedDB for fast re-access
const CACHE_DB_NAME = 'DocumentEditorCache';
const CACHE_STORE_NAME = 'blobs';
const VERSION_STORE_NAME = 'versions';
// const _AUTO_SAVE_INTERVAL = 30000; // Auto-save every 30 seconds - DISABLED
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB max file size

const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const DOC_MIME = 'application/msword';
const PDF_MIME = 'application/pdf';

const getMimeTypeForDocument = (doc: Document, blob?: Blob | null): string => {
  const filename = doc.original_filename?.toLowerCase() || '';
  const blobType = blob?.type?.trim();

  if (filename.endsWith('.pdf') || doc.mime_type === PDF_MIME) {
    return PDF_MIME;
  }

  if (filename.endsWith('.doc') || doc.mime_type === DOC_MIME) {
    return DOC_MIME;
  }

  if (filename.endsWith('.docx') || doc.mime_type === DOCX_MIME) {
    return DOCX_MIME;
  }

  return blobType || doc.mime_type || DOCX_MIME;
};

const getDocumentType = (doc: Document): 'docx' | 'doc' | 'pdf' => {
  const filename = doc.original_filename?.toLowerCase() || '';

  if (doc.mime_type === PDF_MIME || filename.endsWith('.pdf')) {
    return 'pdf';
  }

  if (doc.mime_type === DOC_MIME || filename.endsWith('.doc')) {
    return 'doc';
  }

  return 'docx';
};

const isPdfDocument = (doc: Document) => getDocumentType(doc) === 'pdf';

const shouldBlockDownloadTarget = (href?: string | null, downloadAttr?: string | null) => {
  if (downloadAttr && downloadAttr.length > 0) return true;
  if (!href) return false;
  return href.startsWith('blob:') || href.startsWith('data:');
};

const exportWithoutBrowserDownload = async <T,>(callback: () => Promise<T>): Promise<T> => {
  const originalAnchorClick = HTMLAnchorElement.prototype.click;
  const originalWindowOpen = window.open.bind(window);

  HTMLAnchorElement.prototype.click = function patchedClick(this: HTMLAnchorElement) {
    if (shouldBlockDownloadTarget(this.href, this.getAttribute('download'))) {
      return;
    }
    return originalAnchorClick.call(this);
  };

  window.open = ((url?: string | URL | undefined, target?: string, features?: string) => {
    const urlString = typeof url === 'string' ? url : url?.toString();
    if (shouldBlockDownloadTarget(urlString, null)) {
      return null;
    }
    return originalWindowOpen(url as string | URL | undefined, target, features);
  }) as typeof window.open;

  try {
    return await callback();
  } finally {
    HTMLAnchorElement.prototype.click = originalAnchorClick;
    window.open = originalWindowOpen;
  }
};

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
          // CRITICAL FIX: Validate cached blob is not corrupted/empty
          if (!cached.blob || cached.blob.size === 0) {
            console.warn(`⚠️ Cache corrupted: Empty or null blob for ${storagePath}. Purging cache entry.`);
            // Remove corrupted entry from cache
            const delTx = db.transaction(CACHE_STORE_NAME, 'readwrite');
            delTx.objectStore(CACHE_STORE_NAME).delete(storagePath);
            resolve(null);
            return;
          }
          console.log(`Cache HIT: ${storagePath} (${cached.blob.size} bytes)`);
          resolve(cached.blob);
        } else {
          resolve(null);
        }
      };
      req.onerror = () => {
        console.warn(`Cache retrieval error for ${storagePath}: ${req.error}`);
        resolve(null);
      };
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
// Auto-save to version history disabled - was causing unwanted downloads
// This function kept for reference but not used
// const _saveDocumentVersion = async (docId: string, filename: string, blob: Blob, versionNumber: number) => {
//   try {
//     const db = await openCacheDB();
//     const tx = db.transaction(VERSION_STORE_NAME, 'readwrite');
//     tx.objectStore(VERSION_STORE_NAME).add({
//       docId,
//       filename,
//       blob,
//       versionNumber,
//       timestamp: Date.now(),
//     });
//   } catch (error) {
//     console.warn('Version save failed:', error);
//   }
// };

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
      // Don't retry on abort - fail immediately (Bug #1: AbortError handling)
      if (signal?.aborted || (error instanceof Error && error.name === 'AbortError')) {
        throw error;
      }
      
      lastError = error as Error;
      if (i < maxRetries - 1) {
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
  const { user } = useAuth();
  const superdocInstances = useRef<SuperDoc[]>([]);
  const editedDocsRef = useRef<Map<string, boolean>>(new Map());
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastAutoSaveRef = useRef<Map<string, number>>(new Map()); // Track last save time per doc
  const cleanupTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pdfUrlsRef = useRef<Record<string, string>>({});
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previousActiveElementRef = useRef<HTMLElement | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editedCount, setEditedCount] = useState(0);
  const [documentBlobs, setDocumentBlobs] = useState<(Blob | null)[]>([]);
  const [loadProgress, setLoadProgress] = useState(0);
  const [showConfirmClose, setShowConfirmClose] = useState(false);
  const [fileSizeError, setFileSizeError] = useState<string | null>(null);
  const [pdfUrls, setPdfUrls] = useState<Record<string, string>>({});
  const [initError, setInitError] = useState<string | null>(null);
  const [showDownloadOptions, setShowDownloadOptions] = useState(false);
  const [documentToDownloadIndex, setDocumentToDownloadIndex] = useState<number | null>(null);
  const modifiedLabel = `${editedCount} document${editedCount === 1 ? '' : 's'} modified`;

  // Focus management for accessibility and to avoid aria-hidden warnings when other portal-based dialogs appear.
  useEffect(() => {
    previousActiveElementRef.current = document.activeElement as HTMLElement | null;

    // Ensure focus is moved inside the editor immediately on mount.
    // Use a microtask to allow the portal to mount first.
    queueMicrotask(() => {
      closeButtonRef.current?.focus?.();
      if (document.activeElement !== closeButtonRef.current) {
        dialogRef.current?.focus?.();
      }
    });

    return () => {
      previousActiveElementRef.current?.focus?.();
    };
  }, []);

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
                return;
              }

              // SPEED OPTIMIZATION 2: Download with timeout and retry logic
              const controller = new AbortController();
              const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

              // Get download URL from API
              const result = await downloadDocument(doc.storage_path);

              if (!result.success || !result.url) {
                clearTimeout(timeoutId);
                // Provide detailed error information
                const downloadError = result.error || 'Unknown error';
                console.warn(`Download URL failed for ${doc.original_filename}: ${downloadError}`, {
                  storagePath: doc.storage_path,
                  fileSize: doc.file_size,
                  documentId: doc.id,
                  error: downloadError,
                });
                if (isMounted) {
                  setInitError(
                    `Failed to load "${doc.original_filename}": File not found in storage. ` +
                    `Does the file still exist? (Error: ${downloadError})`
                  );
                }
                blobs[index] = null;
                return;
              }

              try {
                // Fetch the document with retry logic
                const response = await fetchWithRetry(result.url, controller.signal);

                // CRITICAL FIX: Read blob BEFORE clearing timeout to catch partial reads
                blob = await response.blob();
                clearTimeout(timeoutId);

                // CRITICAL FIX: Validate blob is not empty and has valid DOCX/DOC magic bytes
                if (!blob || blob.size === 0) {
                  throw new Error(`Downloaded blob is empty or null for ${doc.original_filename}`);
                }

                // Verify blob size (only check actual downloaded size if metadata was unreliable - Bug #9)
                if (blob.size > MAX_FILE_SIZE * 1.1) { // Allow 10% variance
                  const errorMsg = `Downloaded file too large: ${(blob.size / 1024 / 1024).toFixed(2)}MB`;
                  console.warn(errorMsg);
                  if (isMounted) {
                    setFileSizeError(`${doc.original_filename}: ${errorMsg}`);
                  }
                  blobs[index] = null;
                  return;
                }

                // CRITICAL FIX: Validate DOCX/DOC format by checking magic bytes (if arrayBuffer is available)
                try {
                  const arrayBuffer = await blob.slice(0, 8).arrayBuffer();
                  const uint8arr = new Uint8Array(arrayBuffer);
                  const isValidDocx = uint8arr[0] === 0x50 && uint8arr[1] === 0x4b; // PK = ZIP header
                  const isValidDoc = uint8arr[0] === 0xd0 && uint8arr[1] === 0xcf; // DOC header
                  
                  if (!isValidDocx && !isValidDoc) {
                    console.warn(`⚠️ Invalid document magic bytes for ${doc.original_filename}. Expected DOCX (PK) or DOC (D0CF), got: ${uint8arr.slice(0, 4).join(' ')}`);
                  } else {
                    console.log(`✓ Blob format validated for ${doc.original_filename}`);
                  }
                } catch {
                  // arrayBuffer() not available in this environment (e.g., tests) - skip validation
                  console.debug(`Blob validation skipped (arrayBuffer not available): ${doc.original_filename}`);
                }

                // CRITICAL FIX: For DOCX files, verify XML structure is not corrupted
                if (blob.type.includes('wordprocessingml') || doc.original_filename?.endsWith('.docx')) {
                  try {
                    const arrayBuffer = await blob.arrayBuffer();
                    const zip = new JSZip();
                    await zip.loadAsync(arrayBuffer);
                    
                    // Check critical files exist
                    const hasDocument = zip.file('word/document.xml');
                    
                    if (!hasDocument) {
                      console.error(`⚠️ CRITICAL: DOCX missing word/document.xml - structure is corrupted for ${doc.original_filename}`);
                      showToast({
                        type: 'error',
                        title: 'Document Corrupted',
                        message: `"${doc.original_filename}" has corrupted structure. Some content may be missing.`,
                      });
                    } else {
                      const docContent = await hasDocument.async('text');
                      // Check for empty or minimal content
                      if (docContent.length < 100) {
                        console.warn(`⚠️ WARNING: ${doc.original_filename} document.xml is very small (${docContent.length} bytes) - may be empty or corrupted`);
                      }
                      // Check for excessive paragraph breaks (hidden breaks that cause selection issues)
                      const paragraphMatches = docContent.match(/<w:p>/g) || [];
                      const runMatches = docContent.match(/<w:t>/g) || [];
                      const ratio = runMatches.length > 0 ? paragraphMatches.length / runMatches.length : 0;
                      
                      if (ratio > 0.5) {
                        console.warn(`⚠️ WARNING: ${doc.original_filename} has many paragraph breaks (${paragraphMatches.length}) relative to text runs (${runMatches.length}). This may cause selection/formatting issues.`);
                      }
                      console.log(`✓ DOCX structure verified for ${doc.original_filename} (paragraphs: ${paragraphMatches.length}, text runs: ${runMatches.length})`);
                    }
                  } catch (structureError) {
                    console.error(`Failed to validate DOCX structure for ${doc.original_filename}:`, structureError instanceof Error ? structureError.message : String(structureError));
                  }
                }

                console.log(`✓ Loaded: ${doc.original_filename} (${(blob.size / 1024).toFixed(2)} KB)`);

                // CRITICAL FIX: Auto-repair DOCX documents to restore missing spaces between words
                if (blob.type.includes('wordprocessingml') || doc.original_filename?.endsWith('.docx')) {
                  try {
                    const { blob: repairedBlob, result: repairResult } = await repairDocxStructure(blob);
                    logRepairResult(doc.original_filename, repairResult);
                    if (repairResult.repaired) {
                      blob = repairedBlob;
                      console.log(`✓ Document auto-repaired: ${repairResult.issues.join(', ')}`);
                    }
                  } catch (repairError) {
                    console.warn(`Failed to auto-repair document: ${repairError instanceof Error ? repairError.message : 'Unknown error'}. Continuing with original.`);
                  }
                }

                // Cache for next time
                await setCachedBlob(doc.storage_path, blob);
              } catch (error) {
                clearTimeout(timeoutId);
                const fetchError = error instanceof Error ? error.message : 'Unknown error';
                console.error(`Failed to fetch document blob for ${doc.original_filename}:`, fetchError, error);
                
                if (isMounted) {
                  // Provide specific feedback for different error types
                  let userMessage = `Failed to download "${doc.original_filename}". `;
                  if (fetchError.includes('404') || fetchError.includes('not found')) {
                    userMessage += 'File not found in storage.';
                  } else if (fetchError.includes('401') || fetchError.includes('unauthorized')) {
                    userMessage += 'Permission denied - you may not have access to this file.';
                  } else if (fetchError.includes('timeout') || fetchError.includes('aborted')) {
                    userMessage += 'Download timed out. Please check your connection and try again.';
                  } else {
                    userMessage += `(${fetchError})`;
                  }
                  setInitError(userMessage);
                }
                throw error;
              }
            }

            blobs[index] = blob;
          } catch (error) {
            console.error(`Error loading ${doc.original_filename}:`, error);
            if (isMounted) {
              const errorMsg = error instanceof Error ? error.message : 'Unknown error';
              
              // Only show toast if error wasn't already set (initError takes precedence)
              showToast({
                type: 'error',
                title: 'Failed to load document',
                message: `${doc.original_filename}: ${errorMsg}`,
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
      // Check if at least ONE blob loaded successfully (not all null)
      const hasValidBlob = documentBlobs.some(blob => blob !== null);
      
      if (hasValidBlob) {
        console.log('Document blobs loaded, rendering DOM...');
        console.log('Blobs count:', documentBlobs.length, 'Valid:', documentBlobs.filter(b => b !== null).length);
        setLoading(false);
      } else {
        console.warn('No valid blobs loaded - all documents failed to load');
        // Show error UI after a brief delay (only if initError not already set)
        setTimeout(() => {
          if (loading && !initError) {
            showToast({
              type: 'error',
              title: 'Failed to load documents',
              message: 'All documents failed to load. Please check the files and try again.',
            });
          }
          setLoading(false);
        }, 2000);
      }
    }
  }, [documentBlobs, loading, showToast, initError]);

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
      // Revoke old URLs synchronously to avoid async cleanup issues (Bug #5)
      Object.entries(prev).forEach(([docId, url]) => {
        if (!newUrls[docId]) {
          try {
            URL.revokeObjectURL(url);
          } catch (error) {
            console.warn('Failed to revoke PDF URL:', error);
          }
        }
      });
      // Also store updated URLs in ref for cleanup
      pdfUrlsRef.current = newUrls;
      return newUrls;
    });
  }, [documentsToDisplay, documentBlobs]);



  // Auto-save effect: DISABLED - was causing unwanted auto-downloads
  // Users can manually save by clicking the Save button
  // Auto-save was trying to export blobs which had side effects
  useEffect(() => {
    // Auto-save functionality has been disabled as it was triggering
    // automatic file downloads due to SuperDoc.export() side effects
    console.log('Auto-save feature disabled - please use Save button to persist changes');
    
    return () => {
      if (autoSaveTimerRef.current) {
        clearInterval(autoSaveTimerRef.current);
        autoSaveTimerRef.current = null;
      }
    };
  }, []);

  // AGGRESSIVE MEMORY CLEANUP: clear resources on unmount (avoid setState in cleanup)
  useEffect(() => {
    // Capture refs at effect initialization time to use in cleanup
    const pdfUrls = pdfUrlsRef.current;
    const instances = superdocInstances.current;
    const editedDocs = editedDocsRef.current;
    const lastAutoSave = lastAutoSaveRef.current;
    const autoSaveTimer = autoSaveTimerRef.current;
    const cleanupTimeout = cleanupTimeoutRef.current;

    return () => {
      console.log('🧹 DocumentEditor unmounting - aggressive cleanup starting...');

      // Clear old cleanup timeout first to prevent it from running after unmount (Bug #16)
      if (cleanupTimeout) {
        clearTimeout(cleanupTimeout);
      }

      Object.values(pdfUrls).forEach((url) => {
        try {
          URL.revokeObjectURL(url);
        } catch (error) {
          console.error('Error revoking object URL:', error);
        }
      });

      instances.forEach((instance: SuperDoc | undefined, i: number) => {
        try {
          // Properly destroy the Vue app instance
          if (instance) {
            // Call destroy to clean up Vue internals
            instance.destroy?.();
          }
          
          // Also clear the DOM container to prevent Vue warnings
          const selector = `#editor-${i}`;
          const container = document.querySelector(selector) as HTMLElement;
          if (container) {
            // Remove custom delete handler
            const handler = (container as any).__deleteHandler;
            if (handler) {
              container.removeEventListener('keydown', handler, true);
              (container as any).__deleteHandler = null;
            }
            
            // Check if this is a Vue app root and unmount it explicitly
            const vueApp = (container as any).__vue_app;
            if (vueApp && typeof vueApp.unmount === 'function') {
              try {
                vueApp.unmount();
              } catch {
                // Vue might already be unmounted
              }
            }
            // Clear the container
            container.innerHTML = '';
          }
          
          console.log(`Destroyed SuperDoc instance ${i}`);
        } catch (error) {
          console.error(`Error destroying SuperDoc instance ${i}:`, error);
        }
      });

      editedDocs?.clear();
      lastAutoSave?.clear();

      if (autoSaveTimer) {
        clearInterval(autoSaveTimer);
      }

      // Queue cache pruning for after cleanup completes
      setTimeout(async () => {
        try {
          await pruneOldCache(24 * 60 * 60 * 1000);
          console.log('✓ Cache pruned successfully');
        } catch (error) {
          console.error('Error pruning cache:', error);
        }
      }, 100);

      console.log('✓ Memory cleanup complete');
    };
  }, []);

  // Phase 3: Initialize SuperDoc editors AFTER DOM is rendered - OPTIMIZED for speed
  useEffect(() => {
    let isMounted = true;

    const initializeEditors = async () => {
      try {
        // CRITICAL FIX: Clear old SuperDoc instances and DOM containers first
        // This prevents "already mounted" Vue warnings on re-renders
        superdocInstances.current.forEach((instance: SuperDoc | undefined, i: number) => {
          try {
            if (instance) {
              instance.destroy?.();
            }
            const selector = `#editor-${i}`;
            const container = document.querySelector(selector) as HTMLElement;
            if (container) {
              // Remove custom delete handler
              const handler = (container as any).__deleteHandler;
              if (handler) {
                container.removeEventListener('keydown', handler, true);
                (container as any).__deleteHandler = null;
              }
              
              // Unmount Vue app if it exists
              const vueApp = (container as any).__vue_app;
              if (vueApp && typeof vueApp.unmount === 'function') {
                vueApp.unmount();
              }
              container.innerHTML = '';
            }
          } catch (e) {
            console.debug(`Pre-cleanup failed for instance ${i}:`, e);
          }
        });
        superdocInstances.current = [];

        // 100ms gives us 6 frames at 60fps to ensure layout is complete
        await new Promise(resolve => setTimeout(resolve, 100));

        if (!isMounted) return;

        console.log(`Phase 3: Initializing SuperDoc for ${documentsToDisplay.length} document(s)...`);

        // Lazy-load SuperDoc library and styles once
         
        let SuperDocLib: any = null;
        try {
          const mod = await import('@harbour-enterprises/superdoc');
          // SuperDoc module exports SuperDoc as named export
          if (mod.SuperDoc && typeof mod.SuperDoc === 'function') {
            SuperDocLib = mod.SuperDoc;
          } else {
            // If SuperDoc is not a named export, check all exports to find the constructor
            const exports = Object.values(mod).filter(exp => typeof exp === 'function');
            if (exports.length > 0) {
              SuperDocLib = exports[0];
            } else {
              throw new Error('SuperDoc module does not export a valid constructor. Available exports: ' + Object.keys(mod).join(', '));
            }
          }
          await import('@harbour-enterprises/superdoc/style.css');
        } catch (err) {
          console.error('Failed to load SuperDoc module or styles:', err);
          const errorMsg = err instanceof Error ? err.message : 'Unknown error';
          if (isMounted) {
            setInitError(`Failed to load document editor library: ${errorMsg}`);
            showToast({
              type: 'error',
              title: 'Document Editor Error',
              message: 'Failed to load document editor. Please refresh the page and try again.',
            });
          }
          return;
        }

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
              if (isMounted) {
                showToast({
                  type: 'error',
                  title: 'Editor initialization failed',
                  message: `Could not initialize editor for ${doc.original_filename}. Please refresh and try again.`,
                });
              }
              return;
            }

            console.log(`Initializing: ${doc.original_filename}`);

            // Convert blob to File object (SuperDoc requires File, not just Blob)
            const normalizedMimeType = getMimeTypeForDocument(doc, blob);
            const file = new File([blob], doc.original_filename, { type: normalizedMimeType });

            console.log(`Document type detected: ${docType}`);
            console.log(`File type/MIME: ${file.type}`);
            console.log(`File size: ${file.size} bytes`);
            
            // CRITICAL FIX: Keep persistent reference to blob to prevent garbage collection
            // Store blob alongside SuperDoc instance so it's not lost during parsing
            const blobReference = blob;
            const blobSize = blobReference.size;

            // SPEED OPTIMIZATION: Initialize SuperDoc with minimal settings
             
            const superdoc = new (SuperDocLib as any)({
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

            // CRITICAL FIX: Store blob reference with instance to keep it alive during entire editor lifecycle
            (superdoc as any).__blobReference = blobReference;
            (superdoc as any).__blobSize = blobSize;

            console.log(`SuperDoc instance created for ${doc.original_filename} (blob: ${blobSize} bytes retained)`);

            // Track changes
            superdoc.on('editor-update', () => {
              if (isMounted) {
                editedDocsRef.current.set(doc.id, true);
                setEditedCount(editedDocsRef.current.size);
              }
            });

            superdoc.on('ready', () => {
              console.log(`✓ Ready: ${doc.original_filename}`);
              // Verify blob is still intact
              const storedBlob = (superdoc as any).__blobReference;
              if (!storedBlob || storedBlob.size === 0) {
                console.error(`⚠️ CRITICAL: Blob was lost during parsing for ${doc.original_filename}`);
              } else if (storedBlob.size === (superdoc as any).__blobSize) {
                console.log(`✓ Blob integrity verified for ${doc.original_filename}`);
              }
              // Force visibility of containers
              const container = document.querySelector(selector) as HTMLElement;
              if (container) {
                container.style.visibility = 'visible';
                container.style.opacity = '1';
                
                // CRITICAL FIX: Add custom delete handler to maintain cursor position
                const handleContainerKeyDown = (e: KeyboardEvent) => {
                  // Only handle Delete and Backspace keys
                  if (e.key !== 'Delete' && e.key !== 'Backspace') {
                    return;
                  }
                  
                  // Store current selection state before deletion
                  const selection = window.getSelection();
                  if (!selection || !selection.rangeCount) {
                    return;
                  }
                  
                  // Check if we're at a paragraph/line boundary
                  const range = selection.getRangeAt(0);
                  const preCaretRange = range.cloneRange();
                  preCaretRange.selectNodeContents(container);
                  preCaretRange.setEnd(range.endContainer, range.endOffset);
                  const offset = preCaretRange.toString().length;
                  
                  // After deletion, use a small delay to fix cursor position if needed
                  setTimeout(() => {
                    try {
                      const newSelection = window.getSelection();
                      if (newSelection && newSelection.rangeCount > 0) {
                        const newRange = newSelection.getRangeAt(0);
                        // Check if cursor jumped unexpectedly (to end or very far)
                        const newPreCaretRange = newRange.cloneRange();
                        newPreCaretRange.selectNodeContents(container);
                        newPreCaretRange.setEnd(newRange.endContainer, newRange.endOffset);
                        const newOffset = newPreCaretRange.toString().length;
                        
                        // If cursor jumped more than the deleted content would suggest, try to correct it
                        const deleteSize = e.key === 'Delete' ? 1 : 1;
                        const expectedOffset = offset - (e.key === 'Backspace' ? deleteSize : 0);
                        const cursorJumped = Math.abs(newOffset - expectedOffset) > 5;
                        
                        if (cursorJumped && offset > 0) {
                          console.debug(`Cursor position corrected from ${newOffset} to ~${expectedOffset}`);
                          // Try to restore approximate position
                          try {
                            const correctRange = document.createRange();
                            correctRange.setStart(range.startContainer, Math.max(0, range.startOffset - 1));
                            correctRange.collapse(true);
                            newSelection.removeAllRanges();
                            newSelection.addRange(correctRange);
                          } catch (e) {
                            console.debug('Could not restore cursor position:', e);
                          }
                        }
                      }
                    } catch (error) {
                      console.debug('Cursor position monitoring error:', error);
                    }
                  }, 10);
                };
                
                container.addEventListener('keydown', handleContainerKeyDown, true);
                // Store handler for cleanup
                (container as any).__deleteHandler = handleContainerKeyDown;
              }
            });

            // Handle initialization errors
            superdoc.on('error', (err: Error) => {
              console.error(`SuperDoc error for ${doc.original_filename}:`, err);
              console.error('Error details:', err.message, err.stack);
              // Check if blob is still available when error occurs
              const storedBlob = (superdoc as any).__blobReference;
              console.error(`Blob status on error: ${storedBlob ? 'Present (' + storedBlob.size + ' bytes)' : 'LOST or null'}`);
              if (isMounted) {
                setInitError(`SuperDoc failed to load for ${doc.original_filename}: ${err.message}`);
                showToast({
                  type: 'error',
                  title: 'Editor failed to load',
                  message: `${doc.original_filename}: ${err.message}`,
                });
              }
            });

            superdocInstances.current[i] = superdoc;
          } catch (error) {
            console.error(`Init failed for ${doc.original_filename}:`, error);
            if (isMounted) {
              const errorMsg = error instanceof Error ? error.message : 'Unknown error';
              setInitError(`Failed to initialize editor for ${doc.original_filename}: ${errorMsg}`);
              showToast({
                type: 'error',
                title: 'Editor initialization failed',
                message: `${doc.original_filename}: ${errorMsg}`,
              });
            }
          }
        });

        // SPEED OPTIMIZATION: Use Promise.allSettled for robust parallel execution
        await Promise.allSettled(initPromises);

        if (isMounted) {
          console.log('✓ All editors initialized');
          
          // Check if any editors were actually created for non-PDF documents
          const editableDocsCount = documentsToDisplay.filter(doc => !isPdfDocument(doc)).length;
          const createdEditorsCount = superdocInstances.current.filter(instance => !!instance).length;
          
          if (editableDocsCount > 0 && createdEditorsCount === 0) {
            // No editors were created for editable documents - show error
            console.warn(`No editors created despite ${editableDocsCount} editable documents`);
            setInitError('Document editors failed to initialize. Please close and try again.');
          }
          
          // Force hide loading after initialization completes
          setLoading(false);
        }
      } catch (error) {
        console.error('Init error:', error);
        if (isMounted) {
          setInitError(`Initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
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

  // Helper function to perform reliable download
  const performDownload = (blob: Blob, filename: string) => {
    // Create blob URL
    const url = URL.createObjectURL(blob);
    
    try {
      // Create temporary link element
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.style.display = 'none';
      
      // Add to DOM
      document.body.appendChild(link);
      
      // Trigger download with a small delay to ensure consistency
      setTimeout(() => {
        link.click();
      }, 50);
      
      // Cleanup after download completes
      setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }, 100);
    } catch (error) {
      console.error('Download error:', error);
      // Cleanup on error
      URL.revokeObjectURL(url);
      throw error;
    }
  };

  const handleDownloadEdited = useCallback((index: number, e?: React.MouseEvent) => {
    // Prevent event propagation and default behavior
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }

    // Open the download options modal
    setDocumentToDownloadIndex(index);
    setShowDownloadOptions(true);
  }, []);

  const handleSaveAsCopy = useCallback(() => {
    if (documentsToDisplay.length === 0) return;
    setDocumentToDownloadIndex(0);
    setShowDownloadOptions(true);
  }, [documentsToDisplay.length]);

  const getCurrentDocumentBlob = useCallback(async (
    index: number,
    options?: { isFinalDoc?: boolean }
  ): Promise<Blob | null> => {
    const doc = documentsToDisplay[index];
    if (!doc) return null;

    if (isPdfDocument(doc)) {
      return documentBlobs[index] ?? null;
    }

    const instance = superdocInstances.current[index];
    if (!instance) {
      return null;
    }

    const blob = options?.isFinalDoc
      ? await (instance.export as (options?: unknown) => Promise<Blob | void>)({
          isFinalDoc: true,
        })
      : await exportWithoutBrowserDownload(() =>
          (instance.export as (options?: unknown) => Promise<Blob | void>)({
            isFinalDoc: false,
          })
        );

    return (blob as Blob | null) ?? null;
  }, [documentBlobs, documentsToDisplay]);

  const handleDownloadLocalFromEditor = useCallback(async (index: number) => {
    try {
      const doc = documentsToDisplay[index];
      const blob = await getCurrentDocumentBlob(index, { isFinalDoc: true });

      if (!blob) {
        showToast({
          type: 'error',
          title: 'Download failed',
          message: isPdfDocument(doc) ? 'PDF data is not available for download' : 'Could not export document',
        });
        return;
      }

      performDownload(blob as Blob, doc.original_filename || 'document.docx');
      showToast({
        type: 'success',
        title: 'Download started',
        message: `${doc.original_filename} is downloading`,
      });
    } catch (error) {
      console.error('Error downloading document:', error);
      showToast({
        type: 'error',
        title: 'Download failed',
        message: 'Failed to download the edited document',
      });
    }
  }, [documentsToDisplay, getCurrentDocumentBlob, showToast]);

  const handleSaveToAppFromEditor = useCallback(async (index: number) => {
    try {
      const doc = documentsToDisplay[index];

      if (!user?.id) {
        showToast({
          type: 'error',
          title: 'Save failed',
          message: 'User not authenticated',
        });
        return;
      }

      const blob = await getCurrentDocumentBlob(index, { isFinalDoc: false });
      if (!blob) {
        showToast({
          type: 'error',
          title: 'Save failed',
          message: 'Could not prepare the current document contents',
        });
        return;
      }

      const result = await saveDocumentToApp(doc.id, user.id, { blob });
      if (result.success) {
        showToast({
          type: 'success',
          title: 'Saved to App',
          message: `${doc.original_filename} has been saved to your app library`,
        });
      } else if (result.error) {
        showToast({
          type: 'error',
          title: 'Failed to save to app',
          message: result.error,
        });
      }
    } catch (error) {
      console.error('Error saving to app:', error);
      showToast({
        type: 'error',
        title: 'Save failed',
        message: 'Failed to save document to app',
      });
    }
  }, [documentsToDisplay, getCurrentDocumentBlob, user?.id, showToast]);

  const handleSaveToAppFolderFromEditor = useCallback(async (index: number, folderId: string | null) => {
    try {
      const doc = documentsToDisplay[index];

      if (!user?.id) {
        showToast({
          type: 'error',
          title: 'Save failed',
          message: 'User not authenticated',
        });
        return;
      }

      const blob = await getCurrentDocumentBlob(index, { isFinalDoc: false });
      if (!blob) {
        showToast({
          type: 'error',
          title: 'Save failed',
          message: 'Could not prepare the current document contents',
        });
        return;
      }

      const result = await saveDocumentToAppFolder(doc.id, user.id, folderId, { blob });
      if (result.success) {
        showToast({
          type: 'success',
          title: 'Saved to App Folder',
          message: `${doc.original_filename} has been saved to your application folder`,
        });
      } else if (result.error) {
        showToast({
          type: 'error',
          title: 'Failed to save to app folder',
          message: result.error,
        });
      }
    } catch (error) {
      console.error('Error saving to app folder:', error);
      showToast({
        type: 'error',
        title: 'Save failed',
        message: 'Failed to save document to app folder',
      });
    }
  }, [documentsToDisplay, getCurrentDocumentBlob, user?.id, showToast]);

  const handleSaveAll = useCallback(async () => {
    try {
      setSaving(true);

      if (!user?.id) {
        showToast({
          type: 'error',
          title: 'Save failed',
          message: 'User not authenticated',
        });
        setSaving(false);
        return;
      }

      const editedEntries = documentsToDisplay
        .map((doc, index) => ({ doc, index, instance: superdocInstances.current[index] }))
        .filter(({ doc, instance }) => !!instance && !isPdfDocument(doc) && editedDocsRef.current.get(doc.id));

      if (editedEntries.length === 0) {
        showToast({
          type: 'info',
          title: 'No changes',
          message: 'No documents were edited',
        });
        setSaving(false);
        return;
      }

      let savedCount = 0;
      let failedCount = 0;
      const errors: string[] = [];
      
      // Helper function to validate exported blob size and content
      const validateBlobSize = (originalSize: number, exportedSize: number, filename: string) => {
        if (exportedSize === 0) {
          throw new Error(`Export resulted in empty blob for ${filename}. Document may have failed to export correctly.`);
        }
        const ratio = exportedSize / originalSize;
        if (ratio > 5) {
          console.warn(
            `⚠️ WARNING: File size increased dramatically for ${filename}. ` +
            `Original: ${(originalSize / 1024).toFixed(2)}KB → Exported: ${(exportedSize / 1024 / 1024).toFixed(2)}MB ` +
            `(${ratio.toFixed(1)}x increase). This may indicate embedded metadata or uncompressed data in the export.`
          );
        }
      };
      
      // Optimize DOCX files by re-compressing
      const optimizeDocxBlob = async (blob: Blob): Promise<Blob> => {
        if (!blob.type.includes('wordprocessingml') && !blob.type.includes('officedocument')) {
          return blob;
        }
        
        try {
          const buffer = await blob.arrayBuffer();
          const zip = new JSZip();
          await zip.loadAsync(buffer);
          
          const optimized = await zip.generateAsync({
            type: 'blob',
            compression: 'DEFLATE',
            compressionOptions: { level: 9 },
          });
          
          if (optimized.size < blob.size) {
            const saved = ((blob.size - optimized.size) / blob.size * 100).toFixed(1);
            console.log(`✓ Optimized: ${(blob.size / 1024 / 1024).toFixed(2)}MB → ${(optimized.size / 1024 / 1024).toFixed(2)}MB (${saved}% reduction)`);
            return optimized;
          }
        } catch (error) {
          console.warn('DOCX optimization failed, using original:', error instanceof Error ? error.message : String(error));
        }
        return blob;
      };
      
      for (const { doc, instance } of editedEntries) {
        try {
          console.log(`Exporting ${doc.original_filename}...`);
          
          // Get original file size for comparison
          const originalFileSize = doc.file_size;
          
          // Export document with final output format to ensure all edits are captured
          const blob = await exportWithoutBrowserDownload(() =>
            (instance!.export as (options?: unknown) => Promise<Blob | void>)({
              isFinalDoc: true,
            })
          );

          if (!blob || (blob as Blob).size === 0) {
            console.warn(`Export returned empty or invalid blob for ${doc.original_filename}. Attempting fallback export...`);
            // Try with explicit final export as fallback
            const fallbackBlob = await exportWithoutBrowserDownload(() =>
              (instance!.export as (options?: unknown) => Promise<Blob | void>)({
                isFinalDoc: true,
              })
            );
            
            if (!fallbackBlob || (fallbackBlob as Blob).size === 0) {
              failedCount++;
              const errorMsg = `Could not export ${doc.original_filename} (fallback export also failed)`;
              console.error(errorMsg);
              errors.push(errorMsg);
              continue;
            }
            
            // Validate and optimize fallback blob
            validateBlobSize(originalFileSize, (fallbackBlob as Blob).size, doc.original_filename);
            const optimizedFallbackBlob = await optimizeDocxBlob(fallbackBlob as Blob);
            
            // Verify optimized fallback blob is still valid and has content
            if (!optimizedFallbackBlob || optimizedFallbackBlob.size === 0) {
              failedCount++;
              const errorMsg = `Optimization resulted in empty blob for ${doc.original_filename} (fallback)`;
              console.error(errorMsg);
              errors.push(errorMsg);
              continue;
            }
            
            // Final size check before upload - prevent oversized files (fallback path)
            if (optimizedFallbackBlob.size > MAX_FILE_SIZE) {
              failedCount++;
              const errorMsg = `File too large after optimization (fallback): ${doc.original_filename} (${(optimizedFallbackBlob.size / 1024 / 1024).toFixed(2)}MB max is ${(MAX_FILE_SIZE / 1024 / 1024).toFixed(2)}MB)`;
              console.error(errorMsg);
              errors.push(errorMsg);
              continue;
            }
            
            // Save optimized fallback blob
            const result = await updateDocument(doc.id, optimizedFallbackBlob, user.id);
            if (result.success) {
              savedCount++;
              editedDocsRef.current.delete(doc.id);
              setEditedCount(editedDocsRef.current.size);
              console.log(`✓ Saved (fallback) ${doc.original_filename}`);
            } else {
              failedCount++;
              const errorMsg = `Failed to save ${doc.original_filename}: ${result.error}`;
              console.error(errorMsg);
              errors.push(errorMsg);
            }
          } else {
            // Validate and optimize blob
            validateBlobSize(originalFileSize, (blob as Blob).size, doc.original_filename);
            const optimizedBlob = await optimizeDocxBlob(blob as Blob);
            
            // Verify optimized blob is still valid and has content
            if (!optimizedBlob || optimizedBlob.size === 0) {
              failedCount++;
              const errorMsg = `Optimization resulted in empty blob for ${doc.original_filename}`;
              console.error(errorMsg);
              errors.push(errorMsg);
              continue;
            }
            
            // Final size check before upload - prevent oversized files
            if (optimizedBlob.size > MAX_FILE_SIZE) {
              failedCount++;
              const errorMsg = `File too large after optimization: ${doc.original_filename} (${(optimizedBlob.size / 1024 / 1024).toFixed(2)}MB max is ${(MAX_FILE_SIZE / 1024 / 1024).toFixed(2)}MB)`;
              console.error(errorMsg);
              errors.push(errorMsg);
              continue;
            }
            
            // Save optimized blob
            console.log(`Saving ${doc.original_filename} (${(optimizedBlob).size} bytes)...`);
            const result = await updateDocument(doc.id, optimizedBlob, user.id);
            if (result.success) {
              savedCount++;
              editedDocsRef.current.delete(doc.id);
              setEditedCount(editedDocsRef.current.size);
              console.log(`✓ Saved ${doc.original_filename}`);
            } else {
              failedCount++;
              const errorMsg = `Failed to save ${doc.original_filename}: ${result.error}`;
              console.error(errorMsg);
              errors.push(errorMsg);
            }
          }
        } catch (error) {
          failedCount++;
          const errorMsg = error instanceof Error ? error.message : 'Unknown error';
          console.error(`Error exporting ${doc.original_filename}:`, error);
          errors.push(`${doc.original_filename}: ${errorMsg}`);
        }
      }

      showToast({
        type: failedCount === 0 ? 'success' : savedCount > 0 ? 'warning' : 'error',
        title: failedCount === 0 ? 'Documents saved' : savedCount > 0 ? 'Partial save' : 'Save failed',
        message:
          failedCount === 0
            ? `${savedCount} document(s) saved successfully`
            : savedCount > 0
              ? `${savedCount} document(s) saved, ${failedCount} failed. Check console for details.`
              : 'Failed to save documents. Check console for details.',
      });

      if (savedCount > 0 && failedCount === 0 && onSave) {
        await onSave(documentsToDisplay);
      }

      if (savedCount > 0 && failedCount === 0 && !onSave) {
        setTimeout(() => {
          onClose();
        }, 500);
      }
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
  }, [documentsToDisplay, user?.id, showToast, onSave, onClose]);

  // Keyboard shortcuts support
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Escape to close
      if (e.key === 'Escape' && !showConfirmClose) {
        e.preventDefault();
        handleCloseWithConfirm();
      }
      // Ctrl+S or Cmd+S to save
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (!saving && editedCount > 0) {
          handleSaveAll();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [editedCount, saving, showConfirmClose, handleCloseWithConfirm, handleSaveAll]);

  const content = (
    <>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-3 backdrop-blur-[2px] sm:p-5"
        role="presentation"
      >
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-label="Document Editor"
          tabIndex={-1}
          className="document-editor-shell flex h-[min(92vh,980px)] w-full max-w-[96rem] flex-col overflow-hidden rounded-[28px] border border-slate-200/80 bg-white shadow-[0_32px_120px_rgba(15,23,42,0.28)]"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            ref={closeButtonRef}
            onClick={handleCloseWithConfirm}
            className="absolute right-4 top-4 z-10 inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white/95 text-slate-500 shadow-sm transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 focus:outline-none focus:ring-2 focus:ring-rose-300"
            title="Close editor (Esc)"
            aria-label="Close editor"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>

          {fileSizeError && (
            <div className="mx-4 mt-4 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50/90 p-4 shadow-sm sm:mx-6">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-red-900">File Size Error</p>
                <p className="text-sm text-red-700 mt-1">{fileSizeError}</p>
                <p className="mt-2 text-xs text-red-600">Maximum supported file size is 5MB.</p>
              </div>
              <button
                onClick={() => setFileSizeError(null)}
                className="ml-auto text-red-500 hover:text-red-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {initError && (
            <div className="mx-4 mt-4 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50/90 p-4 shadow-sm sm:mx-6">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold text-red-900">Editor Error</p>
                <p className="text-sm text-red-700 mt-1">{initError}</p>
                <p className="text-sm text-red-600 mt-3">
                  Try deleting and re-uploading the document, or contact support if the issue persists.
                </p>
              </div>
              <button
                onClick={() => setInitError(null)}
                className="ml-auto text-red-500 hover:text-red-700 flex-shrink-0"
                title="Dismiss"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          <div className="flex-1 overflow-hidden bg-[linear-gradient(180deg,#f8fafc_0%,#f3f6fb_100%)] p-3 pt-16 sm:p-5 sm:pt-16">
            {loading ? (
              <div className="flex h-full items-center justify-center rounded-[24px] border border-slate-200 bg-white/70">
                <div className="text-center">
                  <LogoLoader size="lg" showText label="Opening documents..." />
                  <p className="mt-3 text-sm font-medium text-slate-600">
                    {loadProgress > 0 ? `Loading ${Math.round(loadProgress)}%` : 'Preparing editors'}
                  </p>

                  {loadProgress > 0 && (
                    <div className="mx-auto mt-3 h-1.5 w-56 overflow-hidden rounded-full bg-slate-200">
                      <div
                        className="h-full bg-primary-600 transition-all duration-300"
                        style={{ width: `${loadProgress}%` }}
                      />
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className={`grid ${getGridClass()} h-full w-full auto-rows-fr gap-5 overflow-auto pr-1`}>
                {documentsToDisplay.map((doc, index) => {
                  const isPdf = isPdfDocument(doc);

                  return (
                    <div
                      key={doc.id}
                      className="document-editor-panel flex h-full min-h-0 flex-col overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-[0_20px_50px_rgba(15,23,42,0.08)]"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] px-5 py-4 flex-shrink-0">
                        <div className="min-w-0 flex-1">
                          <h3 className="truncate text-base font-bold text-slate-900">{doc.original_filename}</h3>
                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 ring-1 ring-blue-100">v{doc.version}</span>
                            {!isPdf && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-100">
                                Live editing enabled
                              </span>
                            )}
                            {isPdf && (
                              <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-700 px-2.5 py-1 rounded-full text-xs font-semibold">📄 Preview</span>
                            )}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => handleDownloadEdited(index, e)}
                          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 shadow-sm transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-300"
                          title="Download current document"
                        >
                          <Download className="h-4 w-4" />
                          <span>Export</span>
                        </button>
                      </div>

                      {!isPdf && (
                        <div
                          id={`superdoc-toolbar-${index}`}
                          className="toolbar-container flex-shrink-0 overflow-x-auto border-b border-slate-200 bg-slate-50/90 px-3 py-3 sm:px-4"
                        />
                      )}

                      {isPdf ? (
                        <div className="flex min-h-[420px] flex-1 items-center justify-center overflow-auto bg-[radial-gradient(circle_at_top,#f8fafc_0%,#eef3f9_70%)] p-5">
                          {pdfUrls[doc.id] ? (
                            <iframe
                              title={`PDF preview for ${doc.original_filename}`}
                              src={pdfUrls[doc.id]}
                              className="h-full w-full rounded-[20px] border border-slate-200 bg-white shadow-[0_12px_32px_rgba(15,23,42,0.08)]"
                              style={{ minHeight: '420px' }}
                            />
                          ) : (
                            <div className="text-center">
                              <div className="text-sm font-medium text-slate-400">Preparing PDF preview...</div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="document-editor-stage flex-1 overflow-auto bg-[radial-gradient(circle_at_top,#f8fafc_0%,#edf2f7_72%)] p-4 sm:p-6">
                          <div className="mx-auto h-full w-full max-w-[980px] rounded-[22px] border border-slate-200/80 bg-white shadow-[0_16px_40px_rgba(15,23,42,0.08)]">
                            <div
                              id={`superdoc-container-${index}`}
                              className="document-editor-area min-h-[420px] overflow-auto rounded-[22px] bg-white"
                              style={{ minHeight: '420px' }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-4 border-t border-slate-200 bg-white/95 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div className="flex items-center gap-2">
              {editedCount > 0 ? (
                <div className="inline-flex items-center gap-3 rounded-full border border-amber-200 bg-amber-50 px-3.5 py-2 text-sm font-medium text-amber-900">
                  <span className="inline-flex h-7 min-w-7 items-center justify-center rounded-full bg-amber-500 px-1.5 text-xs font-bold text-white">
                    {editedCount}
                  </span>
                  <span>{modifiedLabel}</span>
                </div>
              ) : (
                <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3.5 py-2 text-sm font-medium text-emerald-800">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                  <span>No changes yet</span>
                </div>
              )}
            </div>
            <div className="flex w-full gap-3 sm:w-auto">
              <button
                onClick={handleCloseWithConfirm}
                disabled={saving}
                className="flex-1 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-slate-300 sm:flex-none"
                title="Close without saving (Esc)"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveAsCopy}
                disabled={saving || documentsToDisplay.length === 0}
                className="flex-1 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-semibold text-blue-700 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-blue-300 sm:flex-none"
                title="Choose where to save an edited copy"
              >
                Save As Copy
              </button>
              <button
                onClick={handleSaveAll}
                disabled={saving || editedCount === 0}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white shadow-[0_14px_30px_rgba(15,23,42,0.22)] transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-slate-400 sm:flex-none"
                title="Save all documents (Ctrl+S)"
              >
                {saving && <span className="w-4 h-4"><LogoLoader size="sm" /></span>}
                {saving ? 'Saving In Place...' : `Save In Place (${editedCount})`}
              </button>
            </div>
          </div>
        </div>
      </div>

      {showConfirmClose && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-[2px]">
          <div className="card-base max-w-md w-full rounded-[24px] p-6 shadow-[0_28px_80px_rgba(15,23,42,0.3)]">
            <h3 className="mb-3 text-lg font-bold text-slate-900">Unsaved Changes</h3>
            <p className="mb-6 text-sm text-slate-700">
              You have <span className="font-semibold bg-yellow-100 px-2 py-1 rounded">{editedCount}</span> document
              {editedCount !== 1 ? 's' : ''} with unsaved changes.
              <br/><br/>
              Closing now will discard those changes. Save first to keep them on the server.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowConfirmClose(false)}
                className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-300"
              >
                Keep Editing
              </button>
              <button
                onClick={() => {
                  setShowConfirmClose(false);
                  onClose();
                }}
                className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-300"
              >
                Close Anyway
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );

  // Render via portal to avoid keeping focus inside #root while portal-based dialogs apply aria-hidden.
  if (typeof document === 'undefined') return null;
  
  const documentToDownload = documentToDownloadIndex !== null ? documentsToDisplay[documentToDownloadIndex] : null;
  
  return createPortal(
    <>
      {content}
      {/* Download Options Modal */}
      <DownloadOptionsModal
        isOpen={showDownloadOptions}
        fileName={documentToDownload?.original_filename || 'Document'}
        onClose={() => {
          setShowDownloadOptions(false);
          setDocumentToDownloadIndex(null);
        }}
        onDownloadLocal={async () => {
          if (documentToDownloadIndex !== null) {
            await handleDownloadLocalFromEditor(documentToDownloadIndex);
          }
        }}
        onSaveToApp={async () => {
          if (documentToDownloadIndex !== null) {
            await handleSaveToAppFromEditor(documentToDownloadIndex);
          }
        }}
        onSaveToAppFolder={async (folderId) => {
          if (documentToDownloadIndex !== null) {
            await handleSaveToAppFolderFromEditor(documentToDownloadIndex, folderId);
          }
        }}
      />
    </>,
    document.body
  );
};



