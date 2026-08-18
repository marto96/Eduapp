'use client';

import { useEvents } from '../use-events';
import { useSections } from '@/features/academic/use-sections';

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString('es-AR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export function EventsTable() {
  const { data: events, isLoading, error } = useEvents();
  const { data: sections } = useSections();

  if (isLoading) return <p className="text-sm text-muted-foreground">Cargando...</p>;
  if (error) return <p className="text-sm text-destructive">No se pudieron cargar los eventos.</p>;
  if (!events || events.length === 0) {
    return <p className="text-sm text-muted-foreground">Todavía no hay eventos programados.</p>;
  }

  const sectionNameById = new Map(sections?.map((s) => [s.id, s.name]));

  const sorted = [...events].sort(
    (a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
  );

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr>
            <th className="border border-border p-2 text-left text-xs text-muted-foreground">Inicio</th>
            <th className="border border-border p-2 text-left text-xs text-muted-foreground">Fin</th>
            <th className="border border-border p-2 text-left text-xs text-muted-foreground">Título</th>
            <th className="border border-border p-2 text-left text-xs text-muted-foreground">Sección</th>
            <th className="border border-border p-2 text-left text-xs text-muted-foreground">Estado</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((event) => (
            <tr key={event.id}>
              <td className="border border-border p-2">{formatDateTime(event.startsAt)}</td>
              <td className="border border-border p-2">
                {event.endsAt ? formatDateTime(event.endsAt) : <span className="text-muted-foreground">—</span>}
              </td>
              <td className="border border-border p-2 font-medium">{event.title}</td>
              <td className="border border-border p-2">
                {event.sectionId ? (sectionNameById.get(event.sectionId) ?? event.sectionId) : 'Institucional'}
              </td>
              <td className="border border-border p-2">
                {event.voidedAt ? (
                  <span className="text-xs uppercase text-destructive">Anulado</span>
                ) : (
                  <span className="text-xs text-muted-foreground">Vigente</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
