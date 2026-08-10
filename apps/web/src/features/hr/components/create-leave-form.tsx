'use client';

import { FormEvent, useState } from 'react';
import { useCreateLeave } from '../use-leaves';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { LeaveType } from '@eduapp/shared-types';

const TYPES: { value: LeaveType; label: string }[] = [
  { value: 'vacaciones', label: 'Vacaciones' },
  { value: 'enfermedad', label: 'Enfermedad' },
  { value: 'personal', label: 'Personal' },
  { value: 'otro', label: 'Otro' },
];

export function CreateLeaveForm({ employeeId, onDone }: { employeeId: string; onDone: () => void }) {
  const [type, setType] = useState<LeaveType>('vacaciones');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const createLeave = useCreateLeave();

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!startDate || !endDate) return;
    createLeave.mutate(
      { employeeId, type, startDate, endDate, reason: reason || undefined },
      { onSuccess: onDone },
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3 border-t border-border pt-3">
      <div className="space-y-1.5">
        <Label htmlFor={`type-${employeeId}`}>Tipo</Label>
        <select
          id={`type-${employeeId}`}
          value={type}
          onChange={(e) => setType(e.target.value as LeaveType)}
          className="flex h-10 w-32 rounded border border-border bg-background px-3 text-sm outline-none focus:border-primary"
        >
          {TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`start-${employeeId}`}>Desde</Label>
        <Input
          id={`start-${employeeId}`}
          type="date"
          className="w-40"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`end-${employeeId}`}>Hasta</Label>
        <Input
          id={`end-${employeeId}`}
          type="date"
          className="w-40"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`reason-${employeeId}`}>Motivo</Label>
        <Input
          id={`reason-${employeeId}`}
          placeholder="Opcional"
          className="w-40"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
      </div>
      <Button type="submit" disabled={createLeave.isPending}>
        {createLeave.isPending ? 'Cargando...' : 'Cargar licencia'}
      </Button>
      <Button type="button" variant="ghost" onClick={onDone}>
        Cancelar
      </Button>
      {createLeave.isError && (
        <p className="w-full text-sm text-destructive">
          No se pudo cargar la licencia (¿se superpone con otra existente?).
        </p>
      )}
    </form>
  );
}
