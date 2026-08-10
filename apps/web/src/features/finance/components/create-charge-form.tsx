'use client';

import { FormEvent, useMemo, useState } from 'react';
import { useCreateCharge } from '../use-charges';
import { useEnrollments } from '@/features/enrollment/use-enrollments';
import { useUsers } from '@/features/users/use-users';
import { useSections } from '@/features/academic/use-sections';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { ChargeConcept } from '@eduapp/shared-types';

const CONCEPTS: { value: ChargeConcept; label: string }[] = [
  { value: 'matricula', label: 'Matrícula' },
  { value: 'pension', label: 'Pensión' },
  { value: 'otro', label: 'Otro' },
];

export function CreateChargeForm() {
  const { data: enrollments } = useEnrollments();
  const { data: students } = useUsers('estudiante');
  const { data: sections } = useSections();
  const createCharge = useCreateCharge();

  const [enrollmentId, setEnrollmentId] = useState('');
  const [concept, setConcept] = useState<ChargeConcept>('pension');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState('');

  const studentNameById = useMemo(() => new Map(students?.map((s) => [s.id, s.fullName])), [students]);
  const sectionNameById = useMemo(() => new Map(sections?.map((s) => [s.id, s.name])), [sections]);
  const activeEnrollments = useMemo(
    () => (enrollments ?? []).filter((e) => e.status === 'active'),
    [enrollments],
  );

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!enrollmentId || !amount || !dueDate) return;
    createCharge.mutate(
      { enrollmentId, concept, description, amount: Number(amount), dueDate },
      { onSuccess: () => setDescription('') },
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3">
      <div className="space-y-1.5">
        <Label htmlFor="enrollmentId">Matrícula</Label>
        <select
          id="enrollmentId"
          required
          value={enrollmentId}
          onChange={(e) => setEnrollmentId(e.target.value)}
          className="flex h-10 w-64 rounded border border-border bg-background px-3 text-sm outline-none focus:border-primary"
        >
          <option value="" disabled>
            Seleccioná un estudiante
          </option>
          {activeEnrollments.map((enrollment) => (
            <option key={enrollment.id} value={enrollment.id}>
              {studentNameById.get(enrollment.studentId) ?? enrollment.studentId} — Sección{' '}
              {sectionNameById.get(enrollment.sectionId) ?? enrollment.sectionId}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="concept">Concepto</Label>
        <select
          id="concept"
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
        <Label htmlFor="description">Descripción</Label>
        <Input
          id="description"
          placeholder="Pensión marzo 2026"
          required
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="amount">Monto</Label>
        <Input
          id="amount"
          type="number"
          min={0.01}
          step="0.01"
          className="w-28"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="dueDate">Vencimiento</Label>
        <Input
          id="dueDate"
          type="date"
          className="w-40"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
        />
      </div>
      <Button type="submit" disabled={createCharge.isPending}>
        {createCharge.isPending ? 'Creando...' : 'Crear cargo'}
      </Button>
      {createCharge.isError && (
        <p className="w-full text-sm text-destructive">No se pudo crear el cargo.</p>
      )}
    </form>
  );
}
