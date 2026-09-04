'use client';

import { FormEvent, useState } from 'react';
import { useCreateAcademicYear } from '../use-academic-years';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function CreateAcademicYearForm() {
  const createYear = useCreateAcademicYear();
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    createYear.mutate(
      { name, startDate, endDate },
      { onSuccess: () => { setName(''); setStartDate(''); setEndDate(''); } },
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3">
      <div className="space-y-1.5">
        <Label htmlFor="name">Nombre</Label>
        <Input
          id="name"
          placeholder="2026"
          required
          inputMode="numeric"
          pattern="\d{4}"
          maxLength={4}
          value={name}
          onChange={(e) => setName(e.target.value.replace(/\D/g, '').slice(0, 4))}
          className="w-24"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="startDate">Inicio</Label>
        <Input
          id="startDate"
          type="date"
          required
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="endDate">Fin</Label>
        <Input
          id="endDate"
          type="date"
          required
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
        />
      </div>
      <Button type="submit" disabled={createYear.isPending}>
        {createYear.isPending ? 'Creando...' : 'Crear'}
      </Button>
      {createYear.isError && (
        <p className="w-full text-sm text-destructive">No se pudo crear el año lectivo.</p>
      )}
    </form>
  );
}
