'use client';

import { useAnnouncements } from '@/features/announcements/use-announcements';
import { Card } from '@/components/ui/card';
import { LoadingState } from '@/components/ui/loading-state';

export function RecentAnnouncementsWidget() {
  const { data: announcements, isLoading } = useAnnouncements();

  const recent = (announcements ?? [])
    .filter((a) => !a.voidedAt)
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
    .slice(0, 4);

  return (
    <Card className="lg:col-span-2">
      <p className="text-[10px] uppercase tracking-wide text-primary">Comunicados recientes</p>
      {isLoading && <LoadingState className="mt-2" />}
      {!isLoading && recent.length === 0 && (
        <p className="mt-2 text-sm text-muted-foreground">No hay comunicados todavía.</p>
      )}
      <ul className="mt-2 space-y-2">
        {recent.map((announcement) => (
          <li key={announcement.id} className="text-sm">
            <p className="truncate font-medium">{announcement.title}</p>
            <p className="truncate text-xs text-muted-foreground">{announcement.body}</p>
          </li>
        ))}
      </ul>
    </Card>
  );
}
