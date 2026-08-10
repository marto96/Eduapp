'use client';

import { useState } from 'react';
import { useCharges } from '../use-charges';
import { RecordPaymentForm } from './record-payment-form';
import { useEnrollments } from '@/features/enrollment/use-enrollments';
import { useUsers } from '@/features/users/use-users';
import { useSections } from '@/features/academic/use-sections';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { ChargeStatus } from '@eduapp/shared-types';

const CONCEPT_LABELS: Record<string, string> = {
  matricula: 'Matrícula',
  pension: 'Pensión',
  otro: 'Otro',
};

const STATUS_LABELS: Record<ChargeStatus, string> = {
  pendiente: 'Pendiente',
  parcial: 'Parcial',
  pagado: 'Pagado',
};

const STATUS_CLASSES: Record<ChargeStatus, string> = {
  pendiente: 'text-destructive',
  parcial: 'text-foreground',
  pagado: 'text-muted-foreground',
};

export function ChargesList({ canManage }: { canManage: boolean }) {
  const { data: charges, isLoading, error } = useCharges();
  const { data: enrollments } = useEnrollments();
  const { data: students } = useUsers('estudiante');
  const { data: sections } = useSections();
  const [payingChargeId, setPayingChargeId] = useState<string | null>(null);

  if (isLoading) return <p className="text-sm text-muted-foreground">Cargando...</p>;
  if (error) return <p className="text-sm text-destructive">No se pudieron cargar los cargos.</p>;
  if (!charges || charges.length === 0) {
    return <p className="text-sm text-muted-foreground">Todavía no hay cargos.</p>;
  }

  const enrollmentById = new Map(enrollments?.map((e) => [e.id, e]));
  const studentNameById = new Map(students?.map((s) => [s.id, s.fullName]));
  const sectionNameById = new Map(sections?.map((s) => [s.id, s.name]));

  return (
    <ul className="space-y-2">
      {charges.map((charge) => {
        const enrollment = enrollmentById.get(charge.enrollmentId);
        const studentName = enrollment
          ? (studentNameById.get(enrollment.studentId) ?? enrollment.studentId)
          : charge.enrollmentId;
        const sectionName = enrollment ? sectionNameById.get(enrollment.sectionId) : undefined;

        return (
          <Card key={charge.id} className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">
                  {CONCEPT_LABELS[charge.concept] ?? charge.concept} — {studentName}
                  {sectionName ? ` (Sección ${sectionName})` : ''}
                </p>
                <p className="text-sm text-muted-foreground">
                  {charge.description} — vence {charge.dueDate}
                </p>
              </div>
              <div className="text-right">
                <p className="font-medium">
                  {charge.paidAmount} / {charge.amount}
                </p>
                <span className={`text-xs uppercase ${STATUS_CLASSES[charge.status]}`}>
                  {STATUS_LABELS[charge.status]}
                </span>
              </div>
            </div>

            {canManage && charge.status !== 'pagado' && (
              <>
                {payingChargeId === charge.id ? (
                  <RecordPaymentForm
                    chargeId={charge.id}
                    balance={charge.balance}
                    onDone={() => setPayingChargeId(null)}
                  />
                ) : (
                  <Button variant="ghost" onClick={() => setPayingChargeId(charge.id)}>
                    Registrar pago
                  </Button>
                )}
              </>
            )}
          </Card>
        );
      })}
    </ul>
  );
}
