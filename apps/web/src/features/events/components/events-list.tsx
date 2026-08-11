'use client';

import { useEvents } from '../use-events';
import { Card } from '@/components/ui/card';

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString('es-AR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export function EventsList() {
  const { data: events, isLoading, error } = useEvents();

  if (isLoading) return <p className="text-sm text-muted-foreground">Cargando...</p>;
  if (error) return <p className="text-sm text-destructive">No se pudieron cargar los eventos.</p>;
  if (!events || events.length === 0) {
    return <p className="text-sm text-muted-foreground">Todavía no hay eventos programados.</p>;
  }

  return (
    <ul className="space-y-2">
      {events.map((event) => (
        <Card key={event.id} className="py-3">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-medium">{event.title}</p>
              <p className="mt-1 text-sm text-muted-foreground whitespace-pre-wrap">
                {event.description}
              </p>
            </div>
            <div className="shrink-0 text-right text-xs text-muted-foreground">
              <p>{formatDateTime(event.startsAt)}</p>
              {event.endsAt && <p>hasta {formatDateTime(event.endsAt)}</p>}
            </div>
          </div>
        </Card>
      ))}
    </ul>
  );
}
