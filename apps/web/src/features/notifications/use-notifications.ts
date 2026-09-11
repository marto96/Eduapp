'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Notification } from '@eduapp/shared-types';

async function fetchNotifications(): Promise<Notification[]> {
  const res = await fetch('/api/notifications');
  if (!res.ok) throw new Error('No se pudieron cargar las notificaciones');
  return res.json();
}

async function fetchUnreadCount(): Promise<number> {
  const res = await fetch('/api/notifications/unread-count');
  if (!res.ok) throw new Error('No se pudo obtener el conteo de no leídas');
  const data = await res.json();
  return data.count;
}

async function markRead(id: string): Promise<Notification> {
  const res = await fetch(`/api/notifications/${id}/read`, { method: 'PATCH' });
  if (!res.ok) throw new Error('No se pudo marcar como leída');
  return res.json();
}

async function markAllRead(): Promise<void> {
  const res = await fetch('/api/notifications/read-all', { method: 'PATCH' });
  if (!res.ok) throw new Error('No se pudieron marcar como leídas');
}

export function useNotifications() {
  return useQuery({
    queryKey: ['notifications'],
    queryFn: fetchNotifications,
    refetchInterval: 20000,
  });
}

export function useUnreadNotificationCount() {
  return useQuery({
    queryKey: ['notifications-unread-count'],
    queryFn: fetchUnreadCount,
    refetchInterval: 20000,
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: markRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: markAllRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
    },
  });
}
