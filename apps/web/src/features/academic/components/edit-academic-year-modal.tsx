'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useEditAcademicYear } from '../use-academic-years';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { AcademicYear } from '@eduapp/shared-types';

export function EditAcademicYearModal({
  year,
  onClose,
}: {
  year: AcademicYear | null;
  onClose: () => void;
}) {
  const editYear = useEditAcademicYear();
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    if (!year) return;
    setName(year.name);
    setStartDate(year.startDate);
    setEndDate(year.endDate);
  }, [year]);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!year) return;
    editYear.mutate(
      { id: year.id, name, startDate, endDate },
      { onSuccess: () => onClose() },
    );
  }

  return (
    <Dialog open={!!year} onClose={onClose} title={`Editar año lectivo ${year?.name ?? ''}`}>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="editYearName">Nombre</Label>
          <Input
            id="editYearName"
            required
            inputMode="numeric"
            pattern="\d{4}"
            maxLength={4}
            value={name}
            onChange={(e) => setName(e.target.value.replace(/\D/g, '').slice(0, 4))}
            className="w-24"
          />
        </div>
        <div className="flex gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="editYearStart">Inicio</Label>
            <Input
              id="editYearStart"
              type="date"
              required
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="editYearEnd">Fin</Label>
            <Input
              id="editYearEnd"
              type="date"
              required
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button type="submit" disabled={editYear.isPending}>
            {editYear.isPending ? 'Guardando...' : 'Guardar'}
          </Button>
          <Button variant="ghost" type="button" onClick={onClose}>
            Cancelar
          </Button>
        </div>
        {editYear.isError && (
          <p className="text-sm text-destructive">{editYear.error.message}</p>
        )}
      </form>
    </Dialog>
  );
}
