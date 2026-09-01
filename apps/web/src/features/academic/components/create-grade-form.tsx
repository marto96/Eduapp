'use client';

import { FormEvent, useState } from 'react';
import { useCreateGrade } from '../use-grades';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function CreateGradeForm() {
  const createGrade = useCreateGrade();
  const [name, setName] = useState('');
  const [level, setLevel] = useState('');
  const [order, setOrder] = useState('');

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    createGrade.mutate(
      { name, level, order: Number(order) },
      { onSuccess: () => { setName(''); setLevel(''); setOrder(''); } },
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3">
      <div className="space-y-1.5">
        <Label htmlFor="name">Nombre</Label>
        <Input
          id="name"
          placeholder="1er grado"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="level">Nivel</Label>
        <Input
          id="level"
          placeholder="Primaria"
          required
          value={level}
          onChange={(e) => setLevel(e.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="order">Orden</Label>
        <Input
          id="order"
          type="number"
          min={0}
          placeholder="1"
          className="w-20"
          required
          value={order}
          onChange={(e) => setOrder(e.target.value)}
        />
      </div>
      <Button type="submit" disabled={createGrade.isPending}>
        {createGrade.isPending ? 'Creando...' : 'Crear'}
      </Button>
      {createGrade.isError && (
        <p className="w-full text-sm text-destructive">No se pudo crear el grado.</p>
      )}
    </form>
  );
}
