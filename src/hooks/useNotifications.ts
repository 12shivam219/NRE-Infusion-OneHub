import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import { getNotifications, getUnreadCount, markAsRead, markAllAsRead } from '../lib/api/notifications';
import type { Database } from '../lib/database.types';
import { supabase } from '../lib/supabase';

type Notification = Database['public']['Tables']['notifications']['Row'];

export const useNotifications = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const loadNotifications = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    const result = await getNotifications(user.id);
    if (result.success && result.notifications) {
      setNotifications(result.notifications);
    }
    setLoading(false);
  }, [user]);

  const loadUnreadCount = useCallback(async () => {
    if (!user) return;

    const result = await getUnreadCount(user.id);
    if (result.success && result.count !== undefined) {
      setUnreadCount(result.count);
    }
  }, [user]);

  const handleMarkAsRead = useCallback(async (notificationId: string) => {
    if (!user) return;
    
    await markAsRead(notificationId);
    
    // Batch both API calls
    const [notificationsResult, unreadResult] = await Promise.all([
      getNotifications(user.id),
      getUnreadCount(user.id),
    ]);
    
    // Single state update instead of multiple
    if (notificationsResult.success && notificationsResult.notifications) {
      setNotifications(notificationsResult.notifications);
    }
    if (unreadResult.success && unreadResult.count !== undefined) {
      setUnreadCount(unreadResult.count);
    }
  }, [user?.id]);

  const handleMarkAllAsRead = useCallback(async () => {
    if (!user) return;
    await markAllAsRead(user.id);
    
    // Batch both API calls
    const [notificationsResult, unreadResult] = await Promise.all([
      getNotifications(user.id),
      getUnreadCount(user.id),
    ]);
    
    if (notificationsResult.success && notificationsResult.notifications) {
      setNotifications(notificationsResult.notifications);
    }
    if (unreadResult.success && unreadResult.count !== undefined) {
      setUnreadCount(unreadResult.count);
    }
  }, [user?.id]);

  useEffect(() => {
    if (user) {
      let cancelled = false;

      const run = async () => {
        setLoading(true);
        const [notificationsResult, unreadResult] = await Promise.all([
          getNotifications(user.id),
          getUnreadCount(user.id),
        ]);

        if (cancelled) return;

        if (notificationsResult.success && notificationsResult.notifications) {
          setNotifications(notificationsResult.notifications);
        }
        if (unreadResult.success && unreadResult.count !== undefined) {
          setUnreadCount(unreadResult.count);
        }
        setLoading(false);
      };

      void run();

      const channel = supabase
        .channel(`notifications:${user.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`,
          },
          () => {
            void loadUnreadCount();
            void loadNotifications();
          }
        )
        .subscribe();

      const maybeRefresh = () => {
        if (cancelled) return;
        void loadUnreadCount();
      };

      const handleFocus = () => maybeRefresh();
      const handleVisibility = () => {
        if (document.visibilityState === 'visible') {
          maybeRefresh();
        }
      };

      window.addEventListener('focus', handleFocus);
      document.addEventListener('visibilitychange', handleVisibility);

      return () => {
        cancelled = true;
        window.removeEventListener('focus', handleFocus);
        document.removeEventListener('visibilitychange', handleVisibility);
        supabase.removeChannel(channel);
      };
    }
  }, [user, loadNotifications, loadUnreadCount]);

  return {
    notifications,
    unreadCount,
    loading,
    markAsRead: handleMarkAsRead,
    markAllAsRead: handleMarkAllAsRead,
    refresh: loadNotifications,
  };
};
