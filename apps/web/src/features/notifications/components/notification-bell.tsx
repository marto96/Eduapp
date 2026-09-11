'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  useNotifications,
  useUnreadNotificationCount,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
} from '../use-notifications';

function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return 'ahora';
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.floor(hours / 24);
  return `hace ${days} d`;
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const { data: notifications } = useNotifications();
  const { data: unreadCount } = useUnreadNotificationCount();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  function handleClickNotification(id: string, link: string, readAt: string | null) {
    if (!readAt) markRead.mutate(id);
    setOpen(false);
    router.push(link);
  }

  return (
    <div className="relative">
      <Button
        type="button"
        variant="secondary"
        className="relative h-9 w-9 shrink-0 p-0"
        onClick={() => setOpen((v) => !v)}
        aria-label="Notificaciones"
      >
        <Bell className="h-4 w-4" />
        {!!unreadCount && unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-medium text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </Button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-11 z-50 w-80 rounded border border-border bg-surface p-2 shadow-lg">
            <div className="flex items-center justify-between px-2 py-1.5">
              <span className="text-sm font-medium">Notificaciones</span>
              {!!unreadCount && unreadCount > 0 && (
                <button
                  type="button"
                  className="text-xs text-primary hover:underline"
                  onClick={() => markAllRead.mutate()}
                >
                  Marcar todas como leídas
                </button>
              )}
            </div>
            <div className="max-h-96 overflow-y-auto">
              {!notifications || notifications.length === 0 ? (
                <p className="px-2 py-4 text-center text-sm text-muted-foreground">Sin notificaciones.</p>
              ) : (
                notifications.map((n) => (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => handleClickNotification(n.id, n.link, n.readAt)}
                    className={cn(
                      'block w-full rounded px-2 py-2 text-left transition-colors hover:bg-muted',
                      !n.readAt && 'bg-primary/5',
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium">{n.title}</p>
                      {!n.readAt && <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />}
                    </div>
                    <p className="text-xs text-muted-foreground">{n.body}</p>
                    <p className="mt-1 text-[11px] text-muted-foreground">{relativeTime(n.createdAt)}</p>
                  </button>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
