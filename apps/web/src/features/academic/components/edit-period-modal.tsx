'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useEditPeriod } from '../use-periods';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { Period } from '@eduapp/shared-types';

export function EditPeriodModal({ period, onClose }: { period: Period | null; onClose: () => void }) {
  const editPeriod = useEditPeriod();
  const [name, setName] = useState('');
  const [order, setOrder] = useState('');
  const [weight, setWeight] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    if (!period) return;
    setName(period.name);
    setOrder(String(period.order));
    setWeight(String(Math.round(period.weight * 100)));
    setStartDate(period.startDate);
    setEndDate(period.endDate);
  }, [period]);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!period || !name.trim() || order.trim() === '' || !startDate || !endDate) return;
    editPeriod.mutate(
      { id: period.id, name, order: Number(order), weight: Number(weight) / 100, startDate, endDate },
      { onSuccess: () => onClose() },
    );
  }

  return (
    <Dialog open={!!period} onClose={onClose} title={`Editar ${period?.name ?? 'periodo'}`}>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="editPeriodName">Nombre</Label>
          <Input id="editPeriodName" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="flex gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="editPeriodOrder">Orden</Label>
            <Input
              id="editPeriodOrder"
              type="number"
              min={1}
              value={order}
              onChange={(e) => setOrder(e.target.value)}
              className="w-20"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="editPeriodWeight">Peso (%)</Label>
            <Input
              id="editPeriodWeight"
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
            <Label htmlFor="editPeriodStart">Desde</Label>
            <Input id="editPeriodStart" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="editPeriodEnd">Hasta</Label>
            <Input id="editPeriodEnd" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button type="submit" disabled={editPeriod.isPending}>
            {editPeriod.isPending ? 'Guardando...' : 'Guardar'}
          </Button>
          <Button variant="ghost" type="button" onClick={onClose}>
            Cancelar
          </Button>
        </div>
        {editPeriod.isError && <p className="text-sm text-destructive">{editPeriod.error.message}</p>}
      </form>
    </Dialog>
  );
}
