'use client';

import { useState } from 'react';
import { useEvents, useEditEvent, useVoidEvent } from '../use-events';
import { useSections } from '@/features/academic/use-sections';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { Event } from '@eduapp/shared-types';

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString('es-CO', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function toDatetimeLocal(value: string): string {
  const date = new Date(value);
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60000).toISOString().slice(0, 16);
}

export function EventsList({ canManage = false }: { canManage?: boolean }) {
  const { data: events, isLoading, error } = useEvents();
  const { data: sections } = useSections();
  const editEvent = useEditEvent();
  const voidEvent = useVoidEvent();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const [sectionId, setSectionId] = useState('');

  if (isLoading) return <p className="text-sm text-muted-foreground">Cargando...</p>;
  if (error) return <p className="text-sm text-destructive">No se pudieron cargar los eventos.</p>;
  if (!events || events.length === 0) {
    return <p className="text-sm text-muted-foreground">Todavía no hay eventos programados.</p>;
  }

  const sectionNameById = new Map(sections?.map((s) => [s.id, s.name]));

  function startEditing(event: Event) {
    setEditingId(event.id);
    setTitle(event.title);
    setDescription(event.description);
    setStartsAt(toDatetimeLocal(event.startsAt));
    setEndsAt(event.endsAt ? toDatetimeLocal(event.endsAt) : '');
    setSectionId(event.sectionId ?? '');
  }

  function saveEdit(id: string) {
    if (!title.trim() || !description.trim() || !startsAt) return;
    editEvent.mutate(
      {
        id,
        title,
        description,
        startsAt: new Date(startsAt).toISOString(),
        endsAt: endsAt ? new Date(endsAt).toISOString() : undefined,
        sectionId: sectionId || undefined,
      },
      { onSuccess: () => setEditingId(null) },
    );
  }

  return (
    <ul className="space-y-2">
      {events.map((event) => {
        const isEditing = editingId === event.id;
        return (
          <Card key={event.id} className="py-3">
            {isEditing ? (
              <div className="space-y-2">
                <Input value={title} onChange={(e) => setTitle(e.target.value)} />
                <div className="flex flex-wrap gap-2">
                  <Input
                    type="datetime-local"
                    className="w-56"
                    value={startsAt}
                    onChange={(e) => setStartsAt(e.target.value)}
                  />
                  <Input
                    type="datetime-local"
                    className="w-56"
                    value={endsAt}
                    onChange={(e) => setEndsAt(e.target.value)}
                  />
                </div>
                <select
                  value={sectionId}
                  onChange={(e) => setSectionId(e.target.value)}
                  className="flex h-10 w-56 rounded border border-border bg-background px-3 text-sm outline-none focus:border-primary"
                >
                  <option value="">Institucional (todos)</option>
                  {sections?.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="flex w-full rounded border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                />
                <div className="flex gap-2">
                  <Button type="button" disabled={editEvent.isPending} onClick={() => saveEdit(event.id)}>
                    Guardar
                  </Button>
                  <Button variant="ghost" type="button" onClick={() => setEditingId(null)}>
                    Cancelar
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-medium">
                    {event.title}
                    {event.sectionId && (
                      <span className="ml-2 text-xs text-muted-foreground">
                        ({sectionNameById.get(event.sectionId) ?? 'sección'})
                      </span>
                    )}
                    {event.editedAt && (
                      <span className="ml-2 text-xs text-muted-foreground" title={event.editedAt}>
                        (editado)
                      </span>
                    )}
                    {event.voidedAt && (
                      <span className="ml-2 text-xs uppercase text-destructive">Anulado</span>
                    )}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground whitespace-pre-wrap">
                    {event.description}
                  </p>
                  {canManage && !event.voidedAt && (
                    <div className="mt-2 flex gap-3">
                      <button
                        type="button"
                        className="text-xs text-muted-foreground underline hover:text-foreground"
                        onClick={() => startEditing(event)}
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        className="text-xs text-destructive underline"
                        disabled={voidEvent.isPending}
                        onClick={() => voidEvent.mutate(event.id)}
                      >
                        Anular
                      </button>
                    </div>
                  )}
                </div>
                <div className="shrink-0 text-right text-xs text-muted-foreground">
                  <p>{formatDateTime(event.startsAt)}</p>
                  {event.endsAt && <p>hasta {formatDateTime(event.endsAt)}</p>}
                </div>
              </div>
            )}
          </Card>
        );
      })}
    </ul>
  );
}
