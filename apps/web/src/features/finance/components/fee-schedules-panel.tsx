'use client';

import { FormEvent, useState } from 'react';
import { useFeeSchedules, useCreateFeeSchedule, useEditFeeSchedule } from '../use-fee-schedules';
import { useGrades } from '@/features/academic/use-grades';
import { useAcademicYears } from '@/features/academic/use-academic-years';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatCurrency } from '@/lib/currency';
import type { ChargeConcept } from '@eduapp/shared-types';

const CONCEPTS: { value: ChargeConcept; label: string }[] = [
  { value: 'matricula', label: 'Matrícula' },
  { value: 'pension', label: 'Pensión' },
  { value: 'solicitud_admision', label: 'Solicitud de admisión' },
  { value: 'otro', label: 'Otro' },
];

export function FeeSchedulesPanel() {
  const { data: feeSchedules } = useFeeSchedules();
  const { data: grades } = useGrades();
  const { data: years } = useAcademicYears();
  const createFeeSchedule = useCreateFeeSchedule();
  const editFeeSchedule = useEditFeeSchedule();

  const [gradeId, setGradeId] = useState('');
  const [academicYearId, setAcademicYearId] = useState('');
  const [concept, setConcept] = useState<ChargeConcept>('pension');
  const [amount, setAmount] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState('');

  const gradeNameById = new Map(grades?.map((g) => [g.id, g.name]));
  const yearNameById = new Map(years?.map((y) => [y.id, y.name]));

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!gradeId || !academicYearId || !amount) return;
    createFeeSchedule.mutate(
      { gradeId, academicYearId, concept, amount: Number(amount) },
      { onSuccess: () => setAmount('') },
    );
  }

  function startEditing(id: string, currentAmount: number) {
    setEditingId(id);
    setEditAmount(String(currentAmount));
  }

  function saveEdit(id: string) {
    const amountNum = Number(editAmount);
    if (!amountNum || amountNum <= 0) return;
    editFeeSchedule.mutate({ id, amount: amountNum }, { onSuccess: () => setEditingId(null) });
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="fs-grade">Grado</Label>
          <select
            id="fs-grade"
            required
            value={gradeId}
            onChange={(e) => setGradeId(e.target.value)}
            className="flex h-10 w-40 rounded border border-border bg-background px-3 text-sm outline-none focus:border-primary"
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
          <Label htmlFor="fs-year">Año lectivo</Label>
          <select
            id="fs-year"
            required
            value={academicYearId}
            onChange={(e) => setAcademicYearId(e.target.value)}
            className="flex h-10 w-32 rounded border border-border bg-background px-3 text-sm outline-none focus:border-primary"
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
        <div className="space-y-1.5">
          <Label htmlFor="fs-concept">Concepto</Label>
          <select
            id="fs-concept"
            value={concept}
            onChange={(e) => setConcept(e.target.value as ChargeConcept)}
            className="flex h-10 w-32 rounded border border-border bg-background px-3 text-sm outline-none focus:border-primary"
          >
            {CONCEPTS.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="fs-amount">Monto</Label>
          <Input
            id="fs-amount"
            type="number"
            min={0.01}
            step="0.01"
            className="w-32"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>
        <Button type="submit" disabled={createFeeSchedule.isPending}>
          {createFeeSchedule.isPending ? 'Guardando...' : 'Guardar precio'}
        </Button>
        {createFeeSchedule.isError && (
          <p className="w-full text-sm text-destructive">{createFeeSchedule.error.message}</p>
        )}
      </form>

      {feeSchedules && feeSchedules.length > 0 && (
        <ul className="space-y-2">
          {feeSchedules.map((fs) => (
            <Card key={fs.id} className="flex items-center justify-between py-3">
              <div>
                <p className="font-medium">
                  {CONCEPTS.find((c) => c.value === fs.concept)?.label ?? fs.concept} —{' '}
                  {gradeNameById.get(fs.gradeId) ?? fs.gradeId}
                </p>
                <p className="text-sm text-muted-foreground">
                  Año {yearNameById.get(fs.academicYearId) ?? fs.academicYearId}
                </p>
              </div>
              {editingId === fs.id ? (
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={0.01}
                    step="0.01"
                    className="w-32"
                    value={editAmount}
                    onChange={(e) => setEditAmount(e.target.value)}
                  />
                  <Button type="button" disabled={editFeeSchedule.isPending} onClick={() => saveEdit(fs.id)}>
                    Guardar
                  </Button>
                  <Button variant="ghost" type="button" onClick={() => setEditingId(null)}>
                    Cancelar
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <span className="font-medium">{formatCurrency(fs.amount)}</span>
                  <button
                    type="button"
                    className="text-xs text-muted-foreground underline hover:text-foreground"
                    onClick={() => startEditing(fs.id, fs.amount)}
                  >
                    Editar
                  </button>
                </div>
              )}
            </Card>
          ))}
        </ul>
      )}
    </div>
  );
}
