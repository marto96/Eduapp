'use client';

import { useEvents } from '@/features/events/use-events';
import { Card } from '@/components/ui/card';

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString('es-AR', { dateStyle: 'medium', timeStyle: 'short' });
}

export function UpcomingEventsWidget() {
  const { data: events, isLoading } = useEvents();

  const now = new Date().toISOString();
  const upcoming = (events ?? [])
    .filter((e) => !e.voidedAt && e.startsAt >= now)
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
    .slice(0, 5);

  return (
    <Card className="lg:col-span-2">
      <p className="text-[10px] uppercase tracking-wide text-primary">Próximos eventos</p>
      {isLoading && <p className="mt-2 text-sm text-muted-foreground">Cargando...</p>}
      {!isLoading && upcoming.length === 0 && (
        <p className="mt-2 text-sm text-muted-foreground">No hay eventos próximos.</p>
      )}
      <ul className="mt-2 space-y-2">
        {upcoming.map((event) => (
          <li key={event.id} className="flex items-center justify-between gap-3 text-sm">
            <span className="truncate">{event.title}</span>
            <span className="shrink-0 text-xs text-muted-foreground">
              {formatDateTime(event.startsAt)}
            </span>
          </li>
        ))}
      </ul>
    </Card>
  );
}
