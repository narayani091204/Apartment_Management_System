import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { getSocket } from '@/lib/socket';
import type { Notification } from '@/types/api';

interface NotificationsResponse {
  success: true;
  data: Notification[];
}

/**
 * Fetches the current user's notifications and live-updates the cache when the
 * backend emits `notification:new` over Socket.io.
 */
export function useNotifications() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const { data } = await api.get<NotificationsResponse>('/notifications');
      return data.data;
    },
  });

  useEffect(() => {
    const socket = getSocket();
    function onNew(notification: Notification) {
      queryClient.setQueryData<Notification[]>(['notifications'], (prev) =>
        prev ? [notification, ...prev] : [notification],
      );
    }
    socket.on('notification:new', onNew);
    return () => {
      socket.off('notification:new', onNew);
    };
  }, [queryClient]);

  const notifications = query.data ?? [];
  const unreadCount = notifications.filter((n) => !n.read).length;

  return { ...query, notifications, unreadCount };
}
