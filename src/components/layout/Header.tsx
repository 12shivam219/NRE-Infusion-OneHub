import { useState, useEffect, useCallback } from 'react';
import { Bell, Menu } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { getNotifications, getUnreadCount, markAsRead } from '../../lib/api/notifications';
import type { Database } from '../../lib/database.types';

type Notification = Database['public']['Tables']['notifications']['Row'];

interface HeaderProps {
  onMenuClick?: () => void;
}

export const Header = ({ onMenuClick }: HeaderProps) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showDropdown, setShowDropdown] = useState(false);

  const loadNotifications = useCallback(async () => {
    if (!user) return;
    const result = await getNotifications(user.id);
    if (result.success && result.notifications) {
      setNotifications(result.notifications.slice(0, 5));
    }
  }, [user]);

  const loadUnreadCount = useCallback(async () => {
    if (!user) return;
    const result = await getUnreadCount(user.id);
    if (result.success && result.count !== undefined) {
      setUnreadCount(result.count);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      loadNotifications();
      loadUnreadCount();
    }
  }, [user, loadNotifications, loadUnreadCount]);

  const handleMarkAsRead = async (notificationId: string) => {
    await markAsRead(notificationId);
    loadNotifications();
    loadUnreadCount();
  };

  return (
    <header className="bg-white border-b border-gray-200 px-4 sm:px-6 md:px-8 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={onMenuClick}
            className="md:hidden p-2 hover:bg-gray-100 rounded-lg transition"
            aria-label="Toggle menu"
          >
            <Menu className="w-6 h-6 text-gray-600" />
          </button>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Dashboard</h2>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative">
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition"
            >
              <Bell className="w-5 h-5 sm:w-6 sm:h-6" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-semibold">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {showDropdown && (
              <div className="absolute right-0 mt-2 w-80 max-w-[calc(100vw-2rem)] bg-white rounded-lg shadow-xl border border-gray-200 z-50">
                <div className="p-4 border-b border-gray-200">
                  <h3 className="font-semibold text-gray-900">Notifications</h3>
                </div>

                <div className="max-h-96 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="p-4 text-center text-gray-500">
                      No notifications
                    </div>
                  ) : (
                    notifications.map((notification) => (
                      <div
                        key={notification.id}
                        onClick={() => {
                          if (!notification.read) {
                            handleMarkAsRead(notification.id);
                          }
                        }}
                        className={`p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition ${
                          !notification.read ? 'bg-blue-50' : ''
                        }`}
                      >
                        <div className="flex justify-between items-start gap-2">
                          <h4 className="font-medium text-gray-900 text-sm line-clamp-2">
                            {notification.title}
                          </h4>
                          {!notification.read && (
                            <span className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0 mt-1"></span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                          {notification.message}
                        </p>
                        <p className="text-xs text-gray-400 mt-2">
                          {new Date(notification.created_at).toLocaleString()}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
