'use client';

import { FormEvent, useState } from 'react';
import { useCreateSubject } from '../use-subjects';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function CreateSubjectForm() {
  const createSubject = useCreateSubject();
  const [name, setName] = useState('');
  const [area, setArea] = useState('');

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    createSubject.mutate(
      { name, area },
      { onSuccess: () => { setName(''); setArea(''); } },
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3">
      <div className="space-y-1.5">
        <Label htmlFor="name">Nombre</Label>
        <Input
          id="name"
          placeholder="Matemática"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="area">Área</Label>
        <Input
          id="area"
          placeholder="Ciencias exactas"
          required
          value={area}
          onChange={(e) => setArea(e.target.value)}
        />
      </div>
      <Button type="submit" disabled={createSubject.isPending}>
        {createSubject.isPending ? 'Creando...' : 'Crear'}
      </Button>
      {createSubject.isError && (
        <p className="w-full text-sm text-destructive">No se pudo crear la asignatura.</p>
      )}
    </form>
  );
}
