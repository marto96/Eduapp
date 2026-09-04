'use client';

import { FormEvent, useState } from 'react';
import { useCreatePeriod } from '../use-periods';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function CreatePeriodModal({
  academicYearId,
  open,
  onClose,
}: {
  academicYearId: string;
  open: boolean;
  onClose: () => void;
}) {
  const createPeriod = useCreatePeriod();
  const [name, setName] = useState('');
  const [order, setOrder] = useState('');
  const [weight, setWeight] = useState('25');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  function handleClose() {
    setName('');
    setOrder('');
    setWeight('25');
    setStartDate('');
    setEndDate('');
    onClose();
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!name.trim() || order.trim() === '' || !startDate || !endDate) return;
    createPeriod.mutate(
      { academicYearId, name, order: Number(order), weight: Number(weight) / 100, startDate, endDate },
      { onSuccess: () => handleClose() },
    );
  }

  return (
    <Dialog open={open} onClose={handleClose} title="Agregar período">
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="newPeriodName">Nombre</Label>
          <Input
            id="newPeriodName"
            placeholder="Primer periodo"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div className="flex gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="newPeriodOrder">Orden</Label>
            <Input
              id="newPeriodOrder"
              type="number"
              min={1}
              value={order}
              onChange={(e) => setOrder(e.target.value)}
              className="w-20"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="newPeriodWeight">Peso (%)</Label>
            <Input
              id="newPeriodWeight"
              type="number"
              min={1}
              max={100}
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              className="w-20"
            />
          </div>
        </div>
        <div className="flex gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="newPeriodStart">Desde</Label>
            <Input id="newPeriodStart" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="newPeriodEnd">Hasta</Label>
            <Input id="newPeriodEnd" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button type="submit" disabled={createPeriod.isPending}>
            {createPeriod.isPending ? 'Creando...' : 'Agregar'}
          </Button>
          <Button variant="ghost" type="button" onClick={handleClose}>
            Cancelar
          </Button>
        </div>
        {createPeriod.isError && <p className="text-sm text-destructive">{createPeriod.error.message}</p>}
      </form>
    </Dialog>
  );
}
