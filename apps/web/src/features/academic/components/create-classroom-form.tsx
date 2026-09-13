'use client';

import { FormEvent, useState } from 'react';
import { useCreateClassroom } from '../use-classrooms';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function CreateClassroomForm() {
  const createClassroom = useCreateClassroom();
  const [name, setName] = useState('');
  const [capacity, setCapacity] = useState('');

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const parsedCapacity = Number(capacity);
    if (!name || !parsedCapacity || parsedCapacity <= 0) return;
    createClassroom.mutate(
      { name, capacity: parsedCapacity },
      { onSuccess: () => { setName(''); setCapacity(''); } },
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3">
      <div className="space-y-1.5">
        <Label htmlFor="name">Nombre</Label>
        <Input
          id="name"
          placeholder="Aula 201"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="capacity">Capacidad</Label>
        <Input
          id="capacity"
          type="number"
          min={1}
          placeholder="30"
          required
          value={capacity}
          onChange={(e) => setCapacity(e.target.value)}
        />
      </div>
      <Button type="submit" disabled={createClassroom.isPending}>
        {createClassroom.isPending ? 'Creando...' : 'Crear'}
      </Button>
      {createClassroom.isError && (
        <p className="w-full text-sm text-destructive">No se pudo crear el aula.</p>
      )}
    </form>
  );
}
