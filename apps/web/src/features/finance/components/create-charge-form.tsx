'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useCreateCharge } from '../use-charges';
import { useFeeSchedules } from '../use-fee-schedules';
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
  const { data: feeSchedules } = useFeeSchedules();
  const createCharge = useCreateCharge();

  const [enrollmentId, setEnrollmentId] = useState('');
  const [concept, setConcept] = useState<ChargeConcept>('pension');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [discountAmount, setDiscountAmount] = useState('');

  const studentNameById = useMemo(() => new Map(students?.map((s) => [s.id, s.fullName])), [students]);
  const sectionNameById = useMemo(() => new Map(sections?.map((s) => [s.id, s.name])), [sections]);
  const activeEnrollments = useMemo(
    () => (enrollments ?? []).filter((e) => e.status === 'active'),
    [enrollments],
  );

  // Precarga el monto según la lista de precios del grado del estudiante
  // seleccionado — pero se puede editar a mano después (no la bloquea).
  // Se resetea (no solo "si está vacío") cada vez que cambia matrícula o
  // concepto: si no, un monto tipeado a mano para un estudiante quedaría
  // pegado al cambiar de selección hacia otro estudiante.
  useEffect(() => {
    const enrollment = enrollments?.find((e) => e.id === enrollmentId);
    const section = sections?.find((s) => s.id === enrollment?.sectionId);
    if (!enrollment || !section || !feeSchedules) {
      setAmount('');
      return;
    }
    const match = feeSchedules.find(
      (fs) =>
        fs.gradeId === section.gradeId &&
        fs.academicYearId === enrollment.academicYearId &&
        fs.concept === concept,
    );
    setAmount(match ? String(match.amount) : '');
  }, [enrollmentId, concept, enrollments, sections, feeSchedules]);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!enrollmentId || !amount || !dueDate) return;
    createCharge.mutate(
      {
        enrollmentId,
        concept,
        description,
        amount: Number(amount),
        dueDate,
        discountAmount: discountAmount ? Number(discountAmount) : undefined,
      },
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
            Selecciona un estudiante
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
      <div className="space-y-1.5">
        <Label htmlFor="discountAmount">Beca/descuento</Label>
        <Input
          id="discountAmount"
          type="number"
          min={0}
          step="0.01"
          className="w-28"
          value={discountAmount}
          onChange={(e) => setDiscountAmount(e.target.value)}
        />
      </div>
      <Button type="submit" disabled={createCharge.isPending}>
        {createCharge.isPending ? 'Creando...' : 'Crear cargo'}
      </Button>
      {createCharge.isError && (
        <p className="w-full text-sm text-destructive">{createCharge.error.message}</p>
      )}
    </form>
  );
}
