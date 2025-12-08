import { useEffect, useState } from 'react';
import { User, Clock } from 'lucide-react';
import { getUserName } from '../../lib/api/requirements';

interface AuditLogProps {
  createdAt: string;
  createdBy?: string | null;
  updatedAt?: string;
  updatedBy?: string | null;
  /**
   * If true, component will render for all users (not just admins).
   * If false, component only renders when user is admin (handled by parent).
   */
  isVisibleToNonAdmins?: boolean;
}

export const AuditLog = ({
  createdAt,
  createdBy,
  updatedAt,
  updatedBy,
  isVisibleToNonAdmins = true,
}: AuditLogProps) => {
  const [createdUser, setCreatedUser] = useState<{ name: string; email: string }>({ name: 'Unknown', email: 'N/A' });
  const [updatedUser, setUpdatedUser] = useState<{ name: string; email: string }>({ name: 'Unknown', email: 'N/A' });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserNames = async () => {
      setLoading(true);
      
      // Only fetch if we have a createdBy ID
      if (createdBy) {
        const created = await getUserName(createdBy);
        if (created && created.full_name) {
          setCreatedUser({ name: created.full_name, email: created.email || 'N/A' });
        } else {
          setCreatedUser({ name: 'Unknown', email: 'N/A' });
        }
      }

      // Only fetch if we have a different updatedBy ID
      if (updatedBy && updatedBy !== createdBy) {
        const updated = await getUserName(updatedBy);
        if (updated && updated.full_name) {
          setUpdatedUser({ name: updated.full_name, email: updated.email || 'N/A' });
        } else {
          setUpdatedUser({ name: 'Unknown', email: 'N/A' });
        }
      }
      
      setLoading(false);
    };

    fetchUserNames();
  }, [createdBy, updatedBy]);

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

  // If isVisibleToNonAdmins is false, parent should handle visibility
  // (this component doesn't check user role - that's parent's responsibility)
  if (!isVisibleToNonAdmins) {
    return null;
  }

  // If no createdBy data and no updatedBy data, don't render
  if (!createdBy && !updatedBy) {
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
              <span className="font-medium text-gray-900">{loading ? 'Loading...' : createdUser.name}</span>
              {createdUser.email && createdUser.email !== 'N/A' && (
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
                <span className="font-medium text-gray-900">{loading ? 'Loading...' : updatedUser.name}</span>
                {updatedUser.email && updatedUser.email !== 'N/A' && (
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
