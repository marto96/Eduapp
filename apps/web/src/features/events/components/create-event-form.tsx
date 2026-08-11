'use client';

import { FormEvent, useState } from 'react';
import { useCreateEvent } from '../use-events';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

export function CreateEventForm() {
  const createEvent = useCreateEvent();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!title || !description || !startsAt) return;
    createEvent.mutate(
      {
        title,
        description,
        startsAt: new Date(startsAt).toISOString(),
        endsAt: endsAt ? new Date(endsAt).toISOString() : undefined,
      },
      {
        onSuccess: () => {
          setTitle('');
          setDescription('');
          setStartsAt('');
          setEndsAt('');
        },
      },
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex-1 space-y-1.5" style={{ minWidth: '16rem' }}>
          <Label htmlFor="title">Título</Label>
          <Input
            id="title"
            placeholder="Reunión de padres"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="startsAt">Inicio</Label>
          <Input
            id="startsAt"
            type="datetime-local"
            className="w-56"
            required
            value={startsAt}
            onChange={(e) => setStartsAt(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="endsAt">Fin (opcional)</Label>
          <Input
            id="endsAt"
            type="datetime-local"
            className="w-56"
            value={endsAt}
            onChange={(e) => setEndsAt(e.target.value)}
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="description">Descripción</Label>
        <textarea
          id="description"
          required
          rows={3}
          placeholder="Detalle del evento..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className={cn(
            'flex w-full rounded border border-border bg-background px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary',
          )}
        />
      </div>
      <Button type="submit" disabled={createEvent.isPending}>
        {createEvent.isPending ? 'Creando...' : 'Crear evento'}
      </Button>
      {createEvent.isError && (
        <p className="text-sm text-destructive">No se pudo crear el evento.</p>
      )}
    </form>
  );
}
