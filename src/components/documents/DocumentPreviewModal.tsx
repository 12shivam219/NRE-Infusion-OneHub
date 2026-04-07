import { useEffect, useState, useCallback, useRef } from 'react';
import { Download, ExternalLink, Eye, FileText } from 'lucide-react';
import { Modal } from '../common/Modal';
import { downloadDocument, saveDocumentToApp, saveDocumentToAppFolder } from '../../lib/api/documents';
import { useToast } from '../../contexts/ToastContext';
import { useAuth } from '../../hooks/useAuth';
import { DownloadOptionsModal } from './DownloadOptionsModal';
import type { Database } from '../../lib/database.types';

type Document = Database['public']['Tables']['documents']['Row'];

// Add CSS to make SuperDoc use full width
const ensureSuperDocStyles = () => {
  if (typeof globalThis !== 'undefined' && globalThis.document && !globalThis.document.getElementById('superdoc-fullwidth-styles')) {
    const style = globalThis.document.createElement('style');
    style.id = 'superdoc-fullwidth-styles';
    style.textContent = `
      .document-editor-area {
        margin: 0 auto !important;
        padding: 0 !important;
        display: flex !important;
        flex-direction: column !important;
        justify-content: flex-start !important;
        align-items: center !important;
      }
      .document-editor-area > * {
        margin: 0 auto !important;
        width: 100% !important;
      }
      .document-editor-area canvas {
        display: block !important;
        margin: 0 auto !important;
      }
    `;
    globalThis.document.head.appendChild(style);
  }
};

interface SuperDoc {
  on(event: string, callback: (err?: Error) => void): void;
  destroy(): void;
}

const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const DOC_MIME = 'application/msword';

const getPreviewMimeType = (doc: Document) => {
  const lowerName = (doc.original_filename || doc.filename || '').toLowerCase();
  if (lowerName.endsWith('.doc')) return DOC_MIME;
  if (lowerName.endsWith('.docx')) return DOCX_MIME;
  return doc.mime_type || DOCX_MIME;
};

const getPreviewDocumentType = (doc: Document): 'docx' | 'doc' => {
  const lowerName = (doc.original_filename || doc.filename || '').toLowerCase();
  if (lowerName.endsWith('.doc')) return 'doc';
  return 'docx';
};

interface DocumentPreviewModalProps {
  isOpen: boolean;
  document: Document | null;
  onClose: () => void;
}

export const DocumentPreviewModal = ({ isOpen, document, onClose }: DocumentPreviewModalProps) => {
  const { showToast } = useToast();
  const { user } = useAuth();
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [showDownloadOptions, setShowDownloadOptions] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [documentBlob, setDocumentBlob] = useState<File | null>(null);
  const previewContainerRef = useRef<HTMLDivElement | null>(null);
  const superdocInstanceRef = useRef<SuperDoc | null>(null);

  const fileName = document?.original_filename || document?.filename || 'Document';
  const fileExtension = fileName.includes('.') ? fileName.split('.').pop()?.toUpperCase() : null;
  const isPdf = Boolean(
    document?.mime_type === 'application/pdf' ||
    fileName.toLowerCase().endsWith('.pdf')
  );

  // Define all hooks first, before any conditional returns
  const handleDownloadClick = useCallback((e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setShowDownloadOptions(true);
  }, []);

  const handleDownloadLocal = useCallback(async () => {
    if (!document) return;
    
    try {
      showToast({ type: 'info', title: 'Downloading', message: 'Please wait...' });
      
      const result = await downloadDocument(document.storage_path);
      if (!result.success || !result.url) {
        showToast({
          type: 'error',
          title: 'Download failed',
          message: result.error || 'Unable to download document',
        });
        return;
      }

      // Fetch the file blob and trigger download
      const response = await fetch(result.url);
      if (!response.ok) {
        throw new Error(`Download failed with status ${response.status}`);
      }
      
      const blob = await response.blob();
      
      // Create blob URL and trigger download using globalThis.document
      const blobUrl = URL.createObjectURL(blob);
      const link = globalThis.document.createElement('a');
      link.href = blobUrl;
      link.download = document.original_filename || document.filename || 'document';
      link.style.display = 'none';
      
      globalThis.document.body.appendChild(link);
      link.click();
      globalThis.document.body.removeChild(link);
      
      // Clean up blob URL
      setTimeout(() => URL.revokeObjectURL(blobUrl), 100);
      
      showToast({ 
        type: 'success', 
        title: 'Download completed', 
        message: `${document.original_filename} has been downloaded.` 
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error('Download error:', error);
      showToast({
        type: 'error',
        title: 'Download failed',
        message: message,
      });
    }
  }, [document, showToast]);

  const handleSaveToApp = useCallback(async () => {
    if (!document) return;
    const result = await saveDocumentToApp(document.id, user?.id || '');
    if (result.success) {
      showToast({
        type: 'success',
        title: 'Saved to App',
        message: `${document.original_filename} has been saved to your app library.`,
      });
    } else if (result.error) {
      showToast({
        type: 'error',
        title: 'Failed to save to app',
        message: result.error,
      });
    }
  }, [document, user?.id, showToast]);

  const handleSaveToAppFolder = useCallback(async (folderId: string | null) => {
    if (!document) return;
    const result = await saveDocumentToAppFolder(document.id, user?.id || '', folderId);
    if (result.success) {
      showToast({
        type: 'success',
        title: 'Saved to App Folder',
        message: `${document.original_filename} has been saved to your application folder.`,
      });
    } else if (result.error) {
      showToast({
        type: 'error',
        title: 'Failed to save to app folder',
        message: result.error,
      });
    }
  }, [document, user?.id, showToast]);

  // Effect 1: Download document and prepare blob
  useEffect(() => {
    let cancelled = false;
    const abortController = new AbortController();

    const loadPreview = async () => {
      if (!isOpen) return;
      if (!document) return;

      setIsLoadingPreview(true);
      setPreviewError(null);
      setDocumentBlob(null);
      
      try {
        const res = await downloadDocument(document.storage_path);
        if (cancelled) return;

        if (!res.success || !res.url) {
          setPreviewError(res.error || 'Preview could not be loaded.');
          setPreviewUrl(null);
          return;
        }

        if (isPdf) {
          setPreviewUrl(res.url);
          setIsLoadingPreview(false);
          return;
        }

        setPreviewUrl(null);
        const response = await fetch(res.url, { signal: abortController.signal });
        if (!response.ok) {
          throw new Error(`Failed to fetch preview file (HTTP ${response.status})`);
        }
        const blob = await response.blob();
        if (cancelled) return;

        const file = new File([blob], fileName, {
          type: getPreviewMimeType(document),
        });

        // Store the blob and mark as ready (this triggers container render)
        setDocumentBlob(file);
        setIsLoadingPreview(false);
      } catch (error) {
        if (cancelled) return;
        const message = error instanceof Error ? error.message : 'Preview could not be loaded.';
        setPreviewError(message);
        setIsLoadingPreview(false);
      }
    };

    loadPreview();

    return () => {
      cancelled = true;
      abortController.abort();
    };
  }, [isOpen, document, isPdf, fileName]);

  // Effect 2: Initialize SuperDoc AFTER container is in DOM
  useEffect(() => {
    let cancelled = false;

    const initSuperDoc = async () => {
      if (!documentBlob || !isOpen || isPdf) return;
      if (!document) return; // document prop check

      try {
        // Wait for DOM to fully render the container
        await new Promise(resolve => setTimeout(resolve, 100));
        if (cancelled) return;

        // Verify container exists using ref
        if (!previewContainerRef.current) {
          setPreviewError('Preview container not found');
          return;
        }

        const mod = await import('@harbour-enterprises/superdoc');
        await import('@harbour-enterprises/superdoc/style.css');
        if (cancelled) return;

        const SuperDocLib =
          (mod as Record<string, unknown>).SuperDoc ||
          (mod as Record<string, unknown>).default ||
          Object.values(mod).find((exp) => typeof exp === 'function');

        if (!SuperDocLib || typeof SuperDocLib !== 'function') {
          throw new Error('Document preview engine is unavailable');
        }

        // Destroy old instance if exists
        try {
          superdocInstanceRef.current?.destroy();
        } catch (error) {
          console.warn('Failed to destroy old instance:', error);
        }

        // Initialize SuperDoc with the container element reference
        const instance = new (SuperDocLib as any)({
          selector: previewContainerRef.current,
          documents: [
            {
              id: `preview-${document.id}`,
              type: getPreviewDocumentType(document),
              data: documentBlob,
            },
          ],
          documentMode: 'viewing',
          pagination: true,
          rulers: false,
        });

        instance.on('error', (err?: Error) => {
          if (cancelled) return;
          setPreviewError(err?.message || 'Preview could not be rendered.');
        });

        superdocInstanceRef.current = instance;
      } catch (error) {
        if (cancelled) return;
        const message = error instanceof Error ? error.message : 'Preview could not be loaded.';
        console.error('SuperDoc init error:', message, error);
        setPreviewError(message);
      }
    };

    initSuperDoc();

    return () => {
      cancelled = true;
    };
  }, [documentBlob, isOpen, isPdf, document]);

  // Cleanup on unmount
  useEffect(() => {
    ensureSuperDocStyles();
    
    return () => {
      try {
        superdocInstanceRef.current?.destroy();
      } catch (error) {
        console.warn('Failed to destroy preview instance:', error);
      }
      superdocInstanceRef.current = null;
    };
  }, []);

  // Guard rendering now that all hooks are defined
  if (!document) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={fileName || 'Document Preview'} size="xl">
      <div className="space-y-4 bg-[linear-gradient(180deg,#f8fafc_0%,#f3f6fb_100%)] p-1">
        <div className="document-editor-panel overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-[0_20px_50px_rgba(15,23,42,0.08)]">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] px-5 py-5 sm:px-6">
            <div className="min-w-0 flex-1">
              <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                {isPdf ? 'Preview Mode' : 'Read-Only Document View'}
              </div>
              <h2 className="truncate text-xl font-bold tracking-[-0.02em] text-slate-900">
                {fileName}
              </h2>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {fileExtension && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 ring-1 ring-blue-100">
                    {fileExtension}
                  </span>
                )}
                <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">
                  {document.file_size ? `${(document.file_size / 1024).toFixed(2)} KB` : 'Size unknown'}
                </span>
                <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${
                  isPdf
                    ? 'bg-amber-50 text-amber-700 ring-amber-100'
                    : 'bg-blue-50 text-blue-700 ring-blue-100'
                }`}>
                  <Eye className="h-3.5 w-3.5" />
                  {isPdf ? 'Read-only PDF' : 'Live preview enabled'}
                </span>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {isPdf && (
                <a
                  href="#"
                  onClick={async (e) => {
                    e.preventDefault();
                    if (previewUrl) {
                      const ok = (await import('../../lib/safeRedirect')).safeOpenUrl(previewUrl, '_blank');
                      if (!ok) showToast({ type: 'error', title: 'Blocked Link', message: 'This preview link is not allowed.' });
                      return;
                    }

                    const result = await downloadDocument(document.storage_path);
                    if (result.success && result.url) {
                      const ok = (await import('../../lib/safeRedirect')).safeOpenUrl(result.url, '_blank');
                      if (!ok) showToast({ type: 'error', title: 'Blocked Link', message: 'This download link is not allowed.' });
                    }
                  }}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
                >
                  <ExternalLink className="h-4 w-4" />
                  Open in New Tab
                </a>
              )}
              <button
                type="button"
                onClick={(e) => handleDownloadClick(e)}
                className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(15,23,42,0.18)] transition hover:bg-slate-800"
              >
                <Download className="h-4 w-4" />
                Export
              </button>
            </div>
          </div>

          <div className="document-editor-stage bg-[radial-gradient(circle_at_top,#f8fafc_0%,#edf2f7_72%)] p-4 sm:p-6">
            <div className="flex min-h-[400px] w-full items-center justify-center overflow-hidden rounded-[22px] border border-slate-200/80 bg-white shadow-[0_16px_40px_rgba(15,23,42,0.08)]">
              {isPdf ? (
                isLoadingPreview ? (
                  <div className="text-sm font-medium text-slate-600">Loading preview...</div>
                ) : previewUrl ? (
                  <iframe
                    src={previewUrl}
                    className="h-[600px] w-full border-0"
                    title="Document preview"
                  />
                ) : (
                  <div className="text-center p-8">
                    <FileText className="mx-auto mb-4 h-16 w-16 text-slate-400" />
                    <p className="mb-2 text-slate-600">Preview unavailable</p>
                    <p className="text-xs text-slate-500">{previewError || 'Please download to view the document'}</p>
                  </div>
                )
              ) : isLoadingPreview ? (
                <div className="text-sm font-medium text-slate-600">Loading preview...</div>
              ) : previewError ? (
                <div className="text-center p-8">
                  <FileText className="mx-auto mb-4 h-16 w-16 text-slate-400" />
                  <p className="mb-2 text-slate-600">Preview unavailable</p>
                  <p className="text-xs text-slate-500">{previewError}</p>
                </div>
              ) : (
                <div className="h-[600px] w-full bg-white overflow-auto flex items-start justify-center pt-8">
                  <div
                    ref={previewContainerRef}
                    className="document-editor-area h-fit overflow-visible bg-white flex flex-col items-center justify-start"
                    style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', alignItems: 'center' }}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Download Options Modal */}
      <DownloadOptionsModal
        isOpen={showDownloadOptions}
        fileName={document.original_filename || 'Document'}
        onClose={() => setShowDownloadOptions(false)}
        onDownloadLocal={handleDownloadLocal}
        onSaveToApp={handleSaveToApp}
        onSaveToAppFolder={handleSaveToAppFolder}
      />
    </Modal>
  );
};

