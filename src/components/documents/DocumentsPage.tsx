import { useState, useEffect } from 'react';
import { Upload, FileText, Download, Trash2, Edit, Grid2X2, Grid3X3 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { getDocuments, uploadDocument, deleteDocument, downloadDocument } from '../../lib/api/documents';
import type { Database } from '../../lib/database.types';

type Document = Database['public']['Tables']['documents']['Row'];

export const DocumentsPage = () => {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedDocs, setSelectedDocs] = useState<string[]>([]);
  const [editorLayout, setEditorLayout] = useState<'single' | '2x2' | '3x3'>('single');

  useEffect(() => {
    const loadDocuments = async () => {
      if (!user) return;

      const result = await getDocuments(user.id);
      if (result.success && result.documents) {
        setDocuments(result.documents);
      }
      setLoading(false);
    };

    loadDocuments();
  }, [user]);

  const loadDocuments = async () => {
    if (!user) return;

    const result = await getDocuments(user.id);
    if (result.success && result.documents) {
      setDocuments(result.documents);
    }
    setLoading(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !user) return;

    setUploading(true);

    try {
      for (const file of Array.from(files)) {
        if (
          file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
          file.type === 'application/msword' ||
          file.type === 'application/pdf'
        ) {
          const result = await uploadDocument(file, user.id);
          if (!result.success) {
            console.error('Upload failed for', file.name, result.error);
            alert(`Failed to upload ${file.name}: ${result.error}`);
          } else {
            console.log('Successfully uploaded:', file.name);
          }
        }
      }

      // Refresh documents list after all uploads
      await loadDocuments();
    } catch (error) {
      console.error('Upload error:', error);
      alert('An error occurred during upload');
    } finally {
      setUploading(false);
      // Reset file input
      e.target.value = '';
    }
  };

  const handleDelete = async (documentId: string) => {
    if (!confirm('Are you sure you want to delete this document?')) return;

    const result = await deleteDocument(documentId);
    if (result.success) {
      loadDocuments();
    }
  };

  const handleDownload = async (document: Document) => {
    const result = await downloadDocument(document.storage_path);
    if (result.success && result.url) {
      window.open(result.url, '_blank');
    }
  };

  const toggleDocSelection = (docId: string) => {
    setSelectedDocs((prev) =>
      prev.includes(docId) ? prev.filter((id) => id !== docId) : [...prev, docId]
    );
  };

  const openEditor = () => {
    if (selectedDocs.length === 0) {
      alert('Please select at least one document to edit');
      return;
    }

    const maxDocs = editorLayout === 'single' ? 1 : editorLayout === '2x2' ? 4 : 9;
    if (selectedDocs.length > maxDocs) {
      alert(`Maximum ${maxDocs} documents can be edited in ${editorLayout} layout`);
      return;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading documents...</div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 md:p-8">
      <div className="mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Document Management</h1>
          <p className="text-gray-600 mt-2 text-sm sm:text-base">Upload, edit, and manage your resumes</p>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full sm:w-auto">
          <div className="flex items-center gap-2 bg-white rounded-lg border border-gray-300 p-1">
            <button
              onClick={() => setEditorLayout('single')}
              className={`p-2 rounded transition ${
                editorLayout === 'single' ? 'bg-blue-600 text-white' : 'text-gray-600'
              }`}
              title="Single document"
            >
              <FileText className="w-4 h-4" />
            </button>
            <button
              onClick={() => setEditorLayout('2x2')}
              className={`p-2 rounded transition ${
                editorLayout === '2x2' ? 'bg-blue-600 text-white' : 'text-gray-600'
              }`}
              title="2x2 layout"
            >
              <Grid2X2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setEditorLayout('3x3')}
              className={`p-2 rounded transition ${
                editorLayout === '3x3' ? 'bg-blue-600 text-white' : 'text-gray-600'
              }`}
              title="3x3 layout"
            >
              <Grid3X3 className="w-4 h-4" />
            </button>
          </div>

          <label className="w-full sm:w-auto px-4 sm:px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition cursor-pointer flex items-center justify-center gap-2 text-sm sm:text-base">
            <Upload className="w-4 h-4 sm:w-5 sm:h-5" />
            {uploading ? 'Uploading...' : 'Upload'}
            <input
              type="file"
              multiple
              accept=".doc,.docx,.pdf"
              onChange={handleFileUpload}
              className="hidden"
              disabled={uploading}
            />
          </label>
        </div>
      </div>

      {selectedDocs.length > 0 && (
        <div className="mb-6 p-3 sm:p-4 bg-blue-50 border border-blue-200 rounded-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="text-blue-900 text-sm sm:text-base">
            {selectedDocs.length} document{selectedDocs.length > 1 ? 's' : ''} selected
          </div>
          <button
            onClick={openEditor}
            className="w-full sm:w-auto px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition flex items-center justify-center gap-2 text-sm"
          >
            <Edit className="w-4 h-4" />
            Open in Editor
          </button>
        </div>
      )}

      {documents.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 sm:p-12 text-center">
          <FileText className="w-12 h-12 sm:w-16 sm:h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">No documents yet</h3>
          <p className="text-gray-600 mb-6 text-sm sm:text-base">Upload your first resume to get started</p>
          <label className="inline-flex items-center gap-2 px-4 sm:px-6 py-2 sm:py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition cursor-pointer text-sm sm:text-base">
            <Upload className="w-4 h-4 sm:w-5 sm:h-5" />
            Upload Document
            <input
              type="file"
              multiple
              accept=".doc,.docx,.pdf"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {documents.map((doc) => (
            <div
              key={doc.id}
              className={`bg-white rounded-xl shadow-sm border-2 p-4 sm:p-6 hover:shadow-md transition cursor-pointer ${
                selectedDocs.includes(doc.id) ? 'border-blue-600 bg-blue-50' : 'border-gray-200'
              }`}
              onClick={() => toggleDocSelection(doc.id)}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
                </div>
                <input
                  type="checkbox"
                  checked={selectedDocs.includes(doc.id)}
                  onChange={() => toggleDocSelection(doc.id)}
                  className="w-4 h-4 sm:w-5 sm:h-5"
                  onClick={(e) => e.stopPropagation()}
                />
              </div>

              <h3 className="font-semibold text-gray-900 mb-2 truncate text-sm sm:text-base">
                {doc.original_filename}
              </h3>
              <p className="text-xs sm:text-sm text-gray-500 mb-1">
                Version {doc.version}
              </p>
              <p className="text-xs sm:text-sm text-gray-500 mb-4">
                {(doc.file_size / 1024).toFixed(2)} KB
              </p>
              <p className="text-xs text-gray-400 mb-4">
                {new Date(doc.created_at).toLocaleDateString()}
              </p>

              <div className="flex gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDownload(doc);
                  }}
                  className="flex-1 px-3 sm:px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition flex items-center justify-center gap-2 text-xs sm:text-sm"
                >
                  <Download className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">Download</span>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(doc.id);
                  }}
                  className="px-3 sm:px-4 py-2 bg-red-100 text-red-700 rounded-lg font-medium hover:bg-red-200 transition flex-shrink-0"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
