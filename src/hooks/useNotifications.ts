import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getNotifications, getUnreadCount, markAsRead, markAllAsRead } from '../lib/api/notifications';
import type { Database } from '../lib/database.types';

type Notification = Database['public']['Tables']['notifications']['Row'];

export const useNotifications = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const loadNotifications = async () => {
    if (!user) return;

    setLoading(true);
    const result = await getNotifications(user.id);
    if (result.success && result.notifications) {
      setNotifications(result.notifications);
    }
    setLoading(false);
  };

  const loadUnreadCount = async () => {
    if (!user) return;

    const result = await getUnreadCount(user.id);
    if (result.success && result.count !== undefined) {
      setUnreadCount(result.count);
    }
  };

  const handleMarkAsRead = async (notificationId: string) => {
    await markAsRead(notificationId);
    loadNotifications();
    loadUnreadCount();
  };

  const handleMarkAllAsRead = async () => {
    if (!user) return;
    await markAllAsRead(user.id);
    loadNotifications();
    loadUnreadCount();
  };

  useEffect(() => {
    if (user) {
      loadNotifications();
      loadUnreadCount();

      const interval = setInterval(() => {
        loadUnreadCount();
      }, 30000);

      return () => clearInterval(interval);
    }
  }, [user]);

  return {
    notifications,
    unreadCount,
    loading,
    markAsRead: handleMarkAsRead,
    markAllAsRead: handleMarkAllAsRead,
    refresh: loadNotifications,
  };
};
