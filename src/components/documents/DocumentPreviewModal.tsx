import { useEffect, useState } from 'react';
import { Download, ExternalLink, FileText } from 'lucide-react';
import { Modal } from '../common/Modal';
import { downloadDocument } from '../../lib/api/documents';
import { useToast } from '../../contexts/ToastContext';
import type { Database } from '../../lib/database.types';

type Document = Database['public']['Tables']['documents']['Row'];

interface DocumentPreviewModalProps {
  isOpen: boolean;
  document: Document | null;
  onClose: () => void;
}

export const DocumentPreviewModal = ({ isOpen, document, onClose }: DocumentPreviewModalProps) => {
  const { showToast } = useToast();
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);

  const isPdf = Boolean(document?.filename?.toLowerCase().endsWith('.pdf'));

  useEffect(() => {
    let cancelled = false;

    const loadPreviewUrl = async () => {
      if (!isOpen) return;
      if (!document) return;
      if (!isPdf) {
        setPreviewUrl(null);
        return;
      }

      setIsLoadingPreview(true);
      try {
        const res = await downloadDocument(document.storage_path);
        if (cancelled) return;
        if (res.success && res.url) {
          setPreviewUrl(res.url);
        } else {
          setPreviewUrl(null);
        }
      } finally {
        if (!cancelled) setIsLoadingPreview(false);
      }
    };

    void loadPreviewUrl();

    return () => {
      cancelled = true;
    };
  }, [isOpen, document, isPdf]);

  if (!document) return null;

  const handleDownload = async () => {
    const result = await downloadDocument(document.storage_path);
    if (result.success && result.url) {
      window.open(result.url, '_blank');
    } else {
      showToast({
        type: 'error',
        title: 'Download failed',
        message: result.error || 'Unable to download document',
      });
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={document.filename || 'Document Preview'} size="xl">
      <div className="space-y-4">
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">{document.filename}</p>
            <p className="text-xs text-gray-500 mt-1">
              {document.file_size ? `${(document.file_size / 1024).toFixed(2)} KB` : 'Size unknown'}
            </p>
          </div>
          <div className="flex gap-2 ml-4">
            <button
              onClick={handleDownload}
              className="px-4 py-2 bg-primary-800 text-white rounded-lg font-medium hover:bg-primary-900 transition flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Download
            </button>
            {isPdf && (
              <a
                href="#"
                onClick={async (e) => {
                  e.preventDefault();
                  if (previewUrl) {
                    window.open(previewUrl, '_blank');
                    return;
                  }

                  const result = await downloadDocument(document.storage_path);
                  if (result.success && result.url) window.open(result.url, '_blank');
                }}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition flex items-center gap-2"
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink className="w-4 h-4" />
                Open in New Tab
              </a>
            )}
          </div>
        </div>

        <div className="border border-gray-200 rounded-lg overflow-hidden bg-gray-50 min-h-[400px] flex items-center justify-center">
          {isPdf ? (
            isLoadingPreview ? (
              <div className="text-sm text-gray-600">Loading preview...</div>
            ) : previewUrl ? (
              <iframe
                src={previewUrl}
                className="w-full h-[600px] border-0"
                title="Document preview"
              />
            ) : (
              <div className="text-center p-8">
                <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 mb-2">Preview unavailable</p>
                <p className="text-sm text-gray-500">Please download to view the document</p>
              </div>
            )
          ) : (
            <div className="text-center p-8">
              <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-2">Preview not available for this file type</p>
              <p className="text-sm text-gray-500">Please download to view the document</p>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};

