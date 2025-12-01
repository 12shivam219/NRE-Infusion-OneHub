import { User, Clock } from 'lucide-react';

interface AuditLogProps {
  createdAt: string;
  createdBy?: string | null;
  updatedAt?: string;
  updatedBy?: string | null;
  showToNonAdmins?: boolean;
}

export const AuditLog = ({
  createdAt,
  createdBy,
  updatedAt,
  updatedBy,
  showToNonAdmins = false,
}: AuditLogProps) => {
  // Parse user info from string (format: "Name (email)" or just show ID)
  const parseUserInfo = (userInfo?: string | null) => {
    if (!userInfo) return { name: 'Unknown', email: 'N/A' };
    
    const match = userInfo.match(/(.+?)\s*\(([^)]+)\)/);
    if (match) {
      return { name: match[1].trim(), email: match[2].trim() };
    }
    return { name: userInfo, email: '' };
  };

  const createdUser = parseUserInfo(createdBy);
  const updatedUser = parseUserInfo(updatedBy);

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateString;
    }
  };

  // If showToNonAdmins is false, we don't render anything (admin-only)
  if (!showToNonAdmins) {
    return null;
  }

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3">
      <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
        <Clock className="w-4 h-4" />
        Audit Log
      </h3>

      <div className="space-y-3">
        {/* Created Info */}
        <div className="flex items-start gap-3 text-sm">
          <User className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-gray-600">
              <span className="font-medium text-gray-900">Created</span> by{' '}
              <span className="font-medium text-gray-900">{createdUser.name}</span>
              {createdUser.email && (
                <span className="text-gray-500"> ({createdUser.email})</span>
              )}
            </p>
            <p className="text-gray-500 text-xs mt-1">
              {formatDate(createdAt)}
            </p>
          </div>
        </div>

        {/* Updated Info (if different from created) */}
        {updatedAt && updatedAt !== createdAt && (
          <div className="flex items-start gap-3 text-sm border-t border-gray-200 pt-3">
            <User className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-gray-600">
                <span className="font-medium text-gray-900">Last updated</span> by{' '}
                <span className="font-medium text-gray-900">{updatedUser.name}</span>
                {updatedUser.email && (
                  <span className="text-gray-500"> ({updatedUser.email})</span>
                )}
              </p>
              <p className="text-gray-500 text-xs mt-1">
                {formatDate(updatedAt)}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
