'use client';

import { FormEvent, useState } from 'react';
import { useAcademicYears } from '../use-academic-years';
import { usePeriods, useCreatePeriod, useEditPeriod } from '../use-periods';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LoadingState } from '@/components/ui/loading-state';
import type { Period } from '@eduapp/shared-types';

export function PeriodsPanel({ canManage = false }: { canManage?: boolean }) {
  const { data: years } = useAcademicYears();
  const [academicYearId, setAcademicYearId] = useState('');

  const { data: periods, isLoading, error } = usePeriods(
    academicYearId ? { academicYearId } : undefined,
  );
  const createPeriod = useCreatePeriod();
  const editPeriod = useEditPeriod();

  const [name, setName] = useState('');
  const [order, setOrder] = useState('');
  const [weight, setWeight] = useState('25');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editOrder, setEditOrder] = useState('');
  const [editWeight, setEditWeight] = useState('');
  const [editStartDate, setEditStartDate] = useState('');
  const [editEndDate, setEditEndDate] = useState('');

  const totalWeightPercent = Math.round((periods ?? []).reduce((sum, p) => sum + p.weight, 0) * 100);

  function handleCreate(event: FormEvent) {
    event.preventDefault();
    if (!academicYearId || !name.trim() || order.trim() === '' || !startDate || !endDate) return;
    createPeriod.mutate(
      { academicYearId, name, order: Number(order), weight: Number(weight) / 100, startDate, endDate },
      {
        onSuccess: () => {
          setName('');
          setOrder('');
          setWeight('25');
          setStartDate('');
          setEndDate('');
        },
      },
    );
  }

  function startEditing(period: Period) {
    setEditingId(period.id);
    setEditName(period.name);
    setEditOrder(String(period.order));
    setEditWeight(String(Math.round(period.weight * 100)));
    setEditStartDate(period.startDate);
    setEditEndDate(period.endDate);
  }

  function saveEdit(id: string) {
    if (!editName.trim() || editOrder.trim() === '' || !editStartDate || !editEndDate) return;
    editPeriod.mutate(
      {
        id,
        name: editName,
        order: Number(editOrder),
        weight: Number(editWeight) / 100,
        startDate: editStartDate,
        endDate: editEndDate,
      },
      { onSuccess: () => setEditingId(null) },
    );
  }

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-medium">Períodos</h2>
      <div className="space-y-1.5">
        <Label htmlFor="periodsYear">Año lectivo</Label>
        <select
          id="periodsYear"
          value={academicYearId}
          onChange={(e) => setAcademicYearId(e.target.value)}
          className="flex h-10 w-48 rounded border border-border bg-background px-3 text-sm outline-none focus:border-primary"
        >
          <option value="" disabled>
            Selecciona un año
          </option>
          {years?.map((year) => (
            <option key={year.id} value={year.id}>
              {year.name}
            </option>
          ))}
        </select>
      </div>

      {academicYearId && (
        <>
          {isLoading && <LoadingState />}
          {error && <p className="text-sm text-destructive">No se pudieron cargar los periodos.</p>}
          {periods && periods.length === 0 && (
            <p className="text-sm text-muted-foreground">Ese año lectivo todavía no tiene periodos.</p>
          )}
          {periods && periods.length > 0 && (
            <>
              <ul className="space-y-2">
                {periods.map((period) => {
                  const isEditing = editingId === period.id;
                  return (
                    <Card key={period.id} className="py-3">
                      {isEditing ? (
                        <div className="flex flex-wrap items-end gap-2">
                          <Input
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="max-w-[10rem]"
                          />
                          <Input
                            type="number"
                            min={1}
                            value={editOrder}
                            onChange={(e) => setEditOrder(e.target.value)}
                            className="w-16"
                          />
                          <Input
                            type="number"
                            min={1}
                            max={100}
                            value={editWeight}
                            onChange={(e) => setEditWeight(e.target.value)}
                            className="w-20"
                          />
                          <Input
                            type="date"
                            value={editStartDate}
                            onChange={(e) => setEditStartDate(e.target.value)}
                          />
                          <Input type="date" value={editEndDate} onChange={(e) => setEditEndDate(e.target.value)} />
                          <Button type="button" disabled={editPeriod.isPending} onClick={() => saveEdit(period.id)}>
                            Guardar
                          </Button>
                          <Button variant="ghost" type="button" onClick={() => setEditingId(null)}>
                            Cancelar
                          </Button>
                          {editPeriod.isError && (
                            <p className="w-full text-sm text-destructive">{editPeriod.error.message}</p>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center justify-between">
                          <p className="font-medium">
                            {period.order}. {period.name}
                          </p>
                          <div className="flex items-center gap-3">
                            <span className="text-xs text-muted-foreground">
                              {period.startDate} – {period.endDate}
                            </span>
                            <span className="text-xs uppercase text-muted-foreground">
                              {Math.round(period.weight * 100)}%
                            </span>
                            {canManage && (
                              <button
                                type="button"
                                className="text-xs text-muted-foreground underline hover:text-foreground"
                                onClick={() => startEditing(period)}
                              >
                                Editar
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </Card>
                  );
                })}
              </ul>
              <p className="text-xs text-muted-foreground">
                Suma de pesos: {totalWeightPercent}%
                {totalWeightPercent !== 100 && ' — todavía no llega a 100%'}
              </p>
            </>
          )}

          {canManage && (
            <form onSubmit={handleCreate} className="flex flex-wrap items-end gap-3 border-t border-border pt-3">
              <div className="space-y-1.5">
                <Label htmlFor="periodName">Nombre</Label>
                <Input
                  id="periodName"
                  placeholder="Primer periodo"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-40"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="periodOrder">Orden</Label>
                <Input
                  id="periodOrder"
                  type="number"
                  min={1}
                  value={order}
                  onChange={(e) => setOrder(e.target.value)}
                  className="w-16"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="periodWeight">Peso (%)</Label>
                <Input
                  id="periodWeight"
                  type="number"
                  min={1}
                  max={100}
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  className="w-20"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="periodStart">Desde</Label>
                <Input id="periodStart" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="periodEnd">Hasta</Label>
                <Input id="periodEnd" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </div>
              <Button type="submit" disabled={createPeriod.isPending}>
                {createPeriod.isPending ? 'Creando...' : 'Agregar periodo'}
              </Button>
              {createPeriod.isError && (
                <p className="w-full text-sm text-destructive">{createPeriod.error.message}</p>
              )}
            </form>
          )}
        </>
      )}
    </div>
  );
}
