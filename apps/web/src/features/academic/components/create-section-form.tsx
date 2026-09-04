'use client';

import { FormEvent, useState } from 'react';
import { useCreateSection } from '../use-sections';
import { useGrades } from '../use-grades';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function CreateSectionForm() {
  const { data: grades } = useGrades();
  const createSection = useCreateSection();
  const [gradeId, setGradeId] = useState('');
  const [name, setName] = useState('');

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!gradeId) return;
    createSection.mutate(
      { gradeId, name },
      { onSuccess: () => setName('') },
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3">
      <div className="space-y-1.5">
        <Label htmlFor="gradeId">Grado</Label>
        <select
          id="gradeId"
          required
          value={gradeId}
          onChange={(e) => setGradeId(e.target.value)}
          className="flex h-10 w-48 rounded border border-border bg-background px-3 text-sm outline-none focus:border-primary"
        >
          <option value="" disabled>
            Selecciona un grado
          </option>
          {grades?.map((grade) => (
            <option key={grade.id} value={grade.id}>
              {grade.name}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="name">Nombre</Label>
        <Input
          id="name"
          placeholder="A"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>
      <Button type="submit" disabled={createSection.isPending || !grades?.length}>
        {createSection.isPending ? 'Creando...' : 'Crear'}
      </Button>
      {!grades?.length && (
        <p className="w-full text-sm text-muted-foreground">Creá al menos un grado primero.</p>
      )}
      {createSection.isError && (
        <p className="w-full text-sm text-destructive">No se pudo crear la sección.</p>
      )}
    </form>
  );
}
