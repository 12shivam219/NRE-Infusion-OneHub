import { useState } from 'react';
import { AlertCircle, X, RefreshCw, Wifi, WifiOff } from 'lucide-react';
import { UserFriendlyError } from '../../lib/errorMessages';

interface ErrorAlertProps {
  title: string;
  message: string;
  onRetry?: () => void;
  onDismiss: () => void;
  retryLabel?: string;
  technical?: string;
  recovery?: UserFriendlyError['recovery'];
  showTechnical?: boolean;
}

export const ErrorAlert = ({
  title,
  message,
  onRetry,
  onDismiss,
  retryLabel = 'Try Again',
  technical,
  recovery,
  showTechnical = false,
}: ErrorAlertProps) => {
  const [showTechDetails, setShowTechDetails] = useState(false);
  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

  return (
    <div className="bg-red-50 border-2 border-red-300 rounded-lg p-4 sm:p-5 shadow-sm">
      <div className="flex gap-3 flex-col sm:flex-row">
        <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" aria-hidden="true" />
        
        <div className="flex-1">
          <div className="flex items-start justify-between gap-2 mb-2">
            <h3 className="font-semibold text-red-900 text-base">{title}</h3>
            {!isOnline && (
              <div className="flex items-center gap-1 text-red-700 text-xs">
                <WifiOff className="w-4 h-4" aria-hidden="true" />
                <span>Offline</span>
              </div>
            )}
          </div>
          <p className="text-red-800 text-sm mb-3 leading-relaxed">{message}</p>
          
          {/* Recovery Actions */}
          <div className="flex flex-wrap gap-2 mb-2">
            {recovery && recovery.length > 0 ? (
              recovery.map((action, idx) => (
                <button
                  key={idx}
                  onClick={action.action}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition text-sm flex items-center gap-2 focus-ring"
                >
                  {action.label === 'Check Connection' && <Wifi className="w-4 h-4" aria-hidden="true" />}
                  {action.label === 'Retry' && <RefreshCw className="w-4 h-4" aria-hidden="true" />}
                  {action.label}
                </button>
              ))
            ) : onRetry ? (
              <button
                onClick={onRetry}
                className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition text-sm flex items-center gap-2 focus-ring"
              >
                <RefreshCw className="w-4 h-4" aria-hidden="true" />
                {retryLabel}
              </button>
            ) : null}
            <button
              onClick={onDismiss}
              className="px-4 py-2 bg-gray-200 text-gray-900 rounded-lg font-medium hover:bg-gray-300 transition text-sm flex items-center gap-1 focus-ring"
            >
              <X className="w-4 h-4" aria-hidden="true" />
              Dismiss
            </button>
          </div>

          {/* Technical Details (collapsible) */}
          {technical && (showTechnical || showTechDetails) && (
            <details className="mt-3">
              <summary
                className="text-xs text-red-700 cursor-pointer hover:text-red-900 font-medium"
                onClick={(e) => {
                  e.preventDefault();
                  setShowTechDetails(!showTechDetails);
                }}
              >
                {showTechDetails ? 'Hide' : 'Show'} technical details
              </summary>
              <pre className="mt-2 p-2 bg-red-100 rounded text-xs text-red-900 overflow-auto max-h-32">
                {technical}
              </pre>
            </details>
          )}
        </div>
      </div>
    </div>
  );
};
