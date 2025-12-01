import { useState, useCallback, useEffect } from 'react';
import { Download, X, FileText, Table2 } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { getRequirements } from '../../lib/api/requirements';
import { useToast } from '../../contexts/ToastContext';
import { calculateDaysOpen, exportToCSV, downloadFile } from '../../lib/requirementUtils';
import type { Database } from '../../lib/database.types';

type Requirement = Database['public']['Tables']['requirements']['Row'];

interface ExportOptionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  requirements: Requirement[];
}

const CSV_COLUMNS = [
  'id',
  'title',
  'company',
  'status',
  'priority',
  'rate',
  'primary_tech_stack',
  'location',
  'remote',
  'duration',
  'next_step',
  'created_at',
];

export const ExportOptionsModal = ({ isOpen, onClose, requirements }: ExportOptionsModalProps) => {
  const { showToast } = useToast();
  const [selectedColumns, setSelectedColumns] = useState<string[]>(CSV_COLUMNS);
  const [exportFormat, setExportFormat] = useState<'csv' | 'pdf'>('csv');

  const handleColumnToggle = (column: string) => {
    setSelectedColumns(prev =>
      prev.includes(column)
        ? prev.filter(c => c !== column)
        : [...prev, column]
    );
  };

  const handleSelectAll = () => {
    if (selectedColumns.length === CSV_COLUMNS.length) {
      setSelectedColumns([]);
    } else {
      setSelectedColumns([...CSV_COLUMNS]);
    }
  };

  const handleExportCSV = () => {
    if (selectedColumns.length === 0) {
      showToast({
        type: 'error',
        title: 'No columns selected',
        message: 'Please select at least one column to export',
      });
      return;
    }

    const csv = exportToCSV(requirements, selectedColumns);
    downloadFile(csv, `requirements_${new Date().toISOString().split('T')[0]}.csv`, 'text/csv');

    showToast({
      type: 'success',
      title: 'Export successful',
      message: `${requirements.length} requirements exported to CSV`,
    });
    onClose();
  };

  const handleExportPDF = () => {
    // Create a simple HTML table for PDF generation
    let htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Requirements Report</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          h1 { color: #1f2937; border-bottom: 2px solid #3b82f6; padding-bottom: 10px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th { background-color: #3b82f6; color: white; padding: 10px; text-align: left; font-weight: bold; }
          td { padding: 8px; border-bottom: 1px solid #d1d5db; }
          tr:nth-child(even) { background-color: #f9fafb; }
          .summary { background-color: #f3f4f6; padding: 15px; margin-bottom: 20px; border-radius: 5px; }
          .summary-item { display: inline-block; margin-right: 20px; }
          .summary-label { font-weight: bold; color: #6b7280; }
          .summary-value { color: #1f2937; font-size: 18px; }
          .priority-high { color: #dc2626; font-weight: bold; }
          .priority-medium { color: #f59e0b; font-weight: bold; }
          .priority-low { color: #10b981; font-weight: bold; }
        </style>
      </head>
      <body>
        <h1>Requirements Report</h1>
        <div class="summary">
          <div class="summary-item">
            <span class="summary-label">Generated:</span>
            <span class="summary-value">${new Date().toLocaleDateString()}</span>
          </div>
          <div class="summary-item">
            <span class="summary-label">Total Requirements:</span>
            <span class="summary-value">${requirements.length}</span>
          </div>
          <div class="summary-item">
            <span class="summary-label">Active:</span>
            <span class="summary-value">${requirements.filter(r => r.status !== 'CLOSED' && r.status !== 'REJECTED').length}</span>
          </div>
        </div>
        <table>
          <thead>
            <tr>
              ${selectedColumns.map(col => `<th>${col.replace(/_/g, ' ').toUpperCase()}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${requirements.map(req => `
              <tr>
                ${selectedColumns.map(col => {
                  let value = req[col as keyof Requirement];
                  
                  if (col === 'priority') {
                    const priorityClass = `priority-${(value as string)?.toLowerCase() || 'medium'}`;
                    return `<td class="${priorityClass}">${value || 'Medium'}</td>`;
                  }
                  
                  if (col === 'created_at') {
                    return `<td>${new Date(value as string).toLocaleDateString()}</td>`;
                  }
                  
                  return `<td>${value || '-'}</td>`;
                }).join('')}
              </tr>
            `).join('')}
          </tbody>
        </table>
      </body>
      </html>
    `;

    // Open print dialog
    const printWindow = window.open('', '', 'height=600,width=800');
    if (printWindow) {
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      setTimeout(() => {
        printWindow.print();
      }, 250);
    }

    showToast({
      type: 'success',
      title: 'PDF Export',
      message: 'Print dialog opened. Select "Save as PDF" to download.',
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">Export Requirements</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Format Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">Export Format</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="radio"
                  value="csv"
                  checked={exportFormat === 'csv'}
                  onChange={(e) => setExportFormat(e.target.value as 'csv' | 'pdf')}
                  className="w-4 h-4"
                />
                <span className="flex items-center gap-2 text-gray-700">
                  <Table2 className="w-4 h-4" />
                  CSV (Excel)
                </span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="radio"
                  value="pdf"
                  checked={exportFormat === 'pdf'}
                  onChange={(e) => setExportFormat(e.target.value as 'csv' | 'pdf')}
                  className="w-4 h-4"
                />
                <span className="flex items-center gap-2 text-gray-700">
                  <FileText className="w-4 h-4" />
                  PDF (Print)
                </span>
              </label>
            </div>
          </div>

          {/* Column Selection */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-medium text-gray-700">Columns to Export</label>
              <button
                onClick={handleSelectAll}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                {selectedColumns.length === CSV_COLUMNS.length ? 'Deselect All' : 'Select All'}
              </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 bg-gray-50 p-4 rounded-lg max-h-96 overflow-y-auto">
              {CSV_COLUMNS.map(column => (
                <label key={column} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedColumns.includes(column)}
                    onChange={() => handleColumnToggle(column)}
                    className="w-4 h-4"
                  />
                  <span className="text-sm text-gray-700">{column.replace(/_/g, ' ')}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Summary */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-900">
              You are about to export <strong>{requirements.length}</strong> requirements with{' '}
              <strong>{selectedColumns.length}</strong> columns.
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-gray-200">
            {exportFormat === 'csv' ? (
              <button
                onClick={handleExportCSV}
                className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" />
                Export to CSV
              </button>
            ) : (
              <button
                onClick={handleExportPDF}
                className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" />
                Export to PDF
              </button>
            )}
            <button
              onClick={onClose}
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

interface RequirementsReportProps {
  onClose: () => void;
}

export const RequirementsReport = ({ onClose }: RequirementsReportProps) => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showExportModal, setShowExportModal] = useState(false);
  const [dateRange, setDateRange] = useState({ start: '', end: '' });

  const loadRequirements = useCallback(async () => {
    if (!user) return;
    const result = await getRequirements(user.id);
    if (result.success && result.requirements) {
      setRequirements(result.requirements);
    } else if (result.error) {
      showToast({ type: 'error', title: 'Failed to load requirements', message: result.error });
    }
    setLoading(false);
  }, [user, showToast]);

  useEffect(() => {
    loadRequirements();
  }, [loadRequirements]);

  const filteredRequirements = requirements.filter(req => {
    if (!dateRange.start && !dateRange.end) return true;
    
    const created = new Date(req.created_at);
    const start = dateRange.start ? new Date(dateRange.start) : null;
    const end = dateRange.end ? new Date(dateRange.end) : null;

    if (start && created < start) return false;
    if (end && created > end) return false;
    return true;
  });

  const stats = {
    total: filteredRequirements.length,
    active: filteredRequirements.filter(r => r.status !== 'CLOSED' && r.status !== 'REJECTED').length,
    closed: filteredRequirements.filter(r => r.status === 'CLOSED').length,
    interview: filteredRequirements.filter(r => r.status === 'INTERVIEW').length,
    avgDaysOpen: Math.round(
      filteredRequirements.reduce((sum, r) => sum + calculateDaysOpen(r.created_at), 0) /
      (filteredRequirements.length || 1)
    ),
  };

  if (loading) {
    return <div className="p-6 text-center text-gray-500">Loading report...</div>;
  }

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
          <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">Requirements Report</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="p-6 space-y-6">
            {/* Date Range Filter */}
            <div className="flex gap-4 flex-col sm:flex-row">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">From Date</label>
                <input
                  type="date"
                  value={dateRange.start}
                  onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">To Date</label>
                <input
                  type="date"
                  value={dateRange.end}
                  onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-gray-600 text-sm">Total</p>
                <p className="text-3xl font-bold text-blue-600">{stats.total}</p>
              </div>
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-gray-600 text-sm">Active</p>
                <p className="text-3xl font-bold text-green-600">{stats.active}</p>
              </div>
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <p className="text-gray-600 text-sm">Interview</p>
                <p className="text-3xl font-bold text-purple-600">{stats.interview}</p>
              </div>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <p className="text-gray-600 text-sm">Closed</p>
                <p className="text-3xl font-bold text-gray-600">{stats.closed}</p>
              </div>
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <p className="text-gray-600 text-sm">Avg Days Open</p>
                <p className="text-3xl font-bold text-orange-600">{stats.avgDaysOpen}</p>
              </div>
            </div>

            {/* Requirements Table */}
            <div className="overflow-x-auto border border-gray-200 rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-gray-700">Title</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-700">Company</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-700">Status</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-700">Days Open</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-700">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRequirements.slice(0, 10).map(req => (
                    <tr key={req.id} className="border-b border-gray-200 hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">{req.title}</td>
                      <td className="px-4 py-3 text-gray-600">{req.company || '-'}</td>
                      <td className="px-4 py-3">
                        <span className="inline-block px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800">
                          {req.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{calculateDaysOpen(req.created_at)}</td>
                      <td className="px-4 py-3 text-gray-600">{new Date(req.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {filteredRequirements.length > 10 && (
              <p className="text-sm text-gray-600">Showing 10 of {filteredRequirements.length} requirements</p>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-4 border-t border-gray-200">
              <button
                onClick={() => setShowExportModal(true)}
                className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" />
                Export
              </button>
              <button
                onClick={onClose}
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>

      <ExportOptionsModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        requirements={filteredRequirements}
      />
    </>
  );
};
