import { AlertCircle, X } from 'lucide-react';

interface ErrorAlertProps {
  title: string;
  message: string;
  onRetry?: () => void;
  onDismiss: () => void;
  retryLabel?: string;
}

export const ErrorAlert = ({
  title,
  message,
  onRetry,
  onDismiss,
  retryLabel = 'Try Again',
}: ErrorAlertProps) => (
  <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex gap-3 flex-col sm:flex-row">
    <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
    
    <div className="flex-1">
      <h3 className="font-semibold text-red-900 mb-1">{title}</h3>
      <p className="text-red-800 text-sm mb-3">{message}</p>
      
      <div className="flex gap-2 flex-wrap">
        {onRetry && (
          <button
            onClick={onRetry}
            className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition text-sm"
          >
            {retryLabel}
          </button>
        )}
        <button
          onClick={onDismiss}
          className="px-4 py-2 bg-gray-200 text-gray-900 rounded-lg font-medium hover:bg-gray-300 transition text-sm flex items-center gap-1"
        >
          <X className="w-4 h-4" />
          Dismiss
        </button>
      </div>
    </div>
  </div>
);
