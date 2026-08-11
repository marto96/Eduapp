'use client';

import { useAnnouncements } from '../use-announcements';
import { useUsers } from '@/features/users/use-users';
import { Card } from '@/components/ui/card';

const CATEGORY_LABELS: Record<string, string> = {
  comunicado: 'Comunicado',
  circular: 'Circular',
  aviso: 'Aviso',
};

export function AnnouncementsList() {
  const { data: announcements, isLoading, error } = useAnnouncements();
  const { data: users } = useUsers();

  if (isLoading) return <p className="text-sm text-muted-foreground">Cargando...</p>;
  if (error) return <p className="text-sm text-destructive">No se pudieron cargar los comunicados.</p>;
  if (!announcements || announcements.length === 0) {
    return <p className="text-sm text-muted-foreground">Todavía no hay comunicados publicados.</p>;
  }

  const userNameById = new Map(users?.map((u) => [u.id, u.fullName]));

  return (
    <ul className="space-y-2">
      {announcements.map((announcement) => (
        <Card key={announcement.id} className="py-3">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-medium">
                {CATEGORY_LABELS[announcement.category] ?? announcement.category} — {announcement.title}
              </p>
              <p className="mt-1 text-sm text-muted-foreground whitespace-pre-wrap">{announcement.body}</p>
            </div>
            <div className="shrink-0 text-right text-xs text-muted-foreground">
              <p>{announcement.publishedAt}</p>
              <p>{userNameById.get(announcement.publishedBy) ?? announcement.publishedBy}</p>
            </div>
          </div>
        </Card>
      ))}
    </ul>
  );
}
