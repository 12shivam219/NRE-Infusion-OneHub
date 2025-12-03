import { useState } from 'react';
import { Bell, Menu } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useNotifications } from '../../hooks/useNotifications';

type AppPage = 'dashboard' | 'documents' | 'crm' | 'admin';

interface HeaderProps {
  onMenuClick?: () => void;
  currentPage?: AppPage;
}

const getPageTitle = (page?: AppPage) => {
  switch (page) {
    case 'documents':
      return 'Resume Editor';
    case 'crm':
      return 'Marketing & CRM';
    case 'admin':
      return 'Admin Panel';
    case 'dashboard':
    default:
      return 'Dashboard';
  }
};

export const Header = ({ onMenuClick, currentPage }: HeaderProps) => {
  const { user } = useAuth();
  const { notifications, unreadCount, markAsRead } = useNotifications();
  const [showDropdown, setShowDropdown] = useState(false);

  const title = getPageTitle(currentPage);

  const handleNotificationClick = (notificationId: string, alreadyRead: boolean) => {
    if (!alreadyRead) {
      void markAsRead(notificationId);
    }
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
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900">{title}</h2>
            {user && (
              <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
                Signed in as <span className="font-medium">{user.full_name}</span>
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative">
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition"
              aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
              aria-expanded={showDropdown}
              aria-haspopup="true"
            >
              <Bell className="w-5 h-5 sm:w-6 sm:h-6" aria-hidden="true" />
              {unreadCount > 0 && (
                <span
                  className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-semibold"
                  aria-label={`${unreadCount} unread notifications`}
                >
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {showDropdown && (
              <div
                className="absolute right-0 mt-2 w-80 max-w-[calc(100vw-2rem)] bg-white rounded-lg shadow-xl border border-gray-200 z-50"
                role="region"
                aria-label="Notifications panel"
              >
                <div className="p-4 border-b border-gray-200">
                  <h3 className="font-semibold text-gray-900">Notifications</h3>
                </div>

                <div className="max-h-96 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="p-4 text-center text-gray-500">
                      No notifications
                    </div>
                  ) : (
                    notifications.slice(0, 5).map((notification) => (
                      <button
                        key={notification.id}
                        onClick={() => handleNotificationClick(notification.id, notification.read)}
                        className={`w-full text-left p-4 border-b border-gray-100 hover:bg-gray-50 transition ${
                          !notification.read ? 'bg-blue-50' : ''
                        }`}
                        aria-label={`Notification: ${notification.title}`}
                      >
                        <div className="flex justify-between items-start gap-2">
                          <h4 className="font-medium text-gray-900 text-sm line-clamp-2">
                            {notification.title}
                          </h4>
                          {!notification.read && (
                            <span
                              className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0 mt-1"
                              aria-hidden="true"
                            />
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                          {notification.message}
                        </p>
                        <p className="text-xs text-gray-400 mt-2">
                          {new Date(notification.created_at).toLocaleString()}
                        </p>
                      </button>
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
