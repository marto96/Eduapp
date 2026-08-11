'use client';

import { useState } from 'react';
import { useCharges, useEditCharge, useVoidCharge } from '../use-charges';
import { RecordPaymentForm } from './record-payment-form';
import { ChargePayments } from './charge-payments';
import { useEnrollments } from '@/features/enrollment/use-enrollments';
import { useUsers } from '@/features/users/use-users';
import { useSections } from '@/features/academic/use-sections';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { Charge, ChargeStatus } from '@eduapp/shared-types';

const CONCEPT_LABELS: Record<string, string> = {
  matricula: 'Matrícula',
  pension: 'Pensión',
  otro: 'Otro',
};

const STATUS_LABELS: Record<ChargeStatus, string> = {
  pendiente: 'Pendiente',
  parcial: 'Parcial',
  pagado: 'Pagado',
  anulado: 'Anulado',
};

const STATUS_CLASSES: Record<ChargeStatus, string> = {
  pendiente: 'text-destructive',
  parcial: 'text-foreground',
  pagado: 'text-muted-foreground',
  anulado: 'text-destructive',
};

export function ChargesList({ canManage }: { canManage: boolean }) {
  const { data: charges, isLoading, error } = useCharges();
  const { data: enrollments } = useEnrollments();
  const { data: students } = useUsers('estudiante');
  const { data: sections } = useSections();
  const editCharge = useEditCharge();
  const voidCharge = useVoidCharge();
  const [payingChargeId, setPayingChargeId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [discountAmount, setDiscountAmount] = useState('');

  if (isLoading) return <p className="text-sm text-muted-foreground">Cargando...</p>;
  if (error) return <p className="text-sm text-destructive">No se pudieron cargar los cargos.</p>;
  if (!charges || charges.length === 0) {
    return <p className="text-sm text-muted-foreground">Todavía no hay cargos.</p>;
  }

  const enrollmentById = new Map(enrollments?.map((e) => [e.id, e]));
  const studentNameById = new Map(students?.map((s) => [s.id, s.fullName]));
  const sectionNameById = new Map(sections?.map((s) => [s.id, s.name]));

  function startEditing(charge: Charge) {
    setEditingId(charge.id);
    setAmount(String(charge.amount));
    setDescription(charge.description);
    setDueDate(charge.dueDate);
    setDiscountAmount(charge.discountAmount ? String(charge.discountAmount) : '');
  }

  function saveEdit(id: string) {
    const amountNum = Number(amount);
    if (!amountNum || amountNum <= 0 || !description.trim() || !dueDate) return;
    editCharge.mutate(
      {
        id,
        amount: amountNum,
        description,
        dueDate,
        discountAmount: discountAmount ? Number(discountAmount) : undefined,
      },
      { onSuccess: () => setEditingId(null) },
    );
  }

  return (
    <ul className="space-y-2">
      {charges.map((charge) => {
        const enrollment = enrollmentById.get(charge.enrollmentId);
        const studentName = enrollment
          ? (studentNameById.get(enrollment.studentId) ?? enrollment.studentId)
          : charge.enrollmentId;
        const sectionName = enrollment ? sectionNameById.get(enrollment.sectionId) : undefined;
        const isEditing = editingId === charge.id;

        return (
          <Card key={charge.id} className="space-y-3">
            {isEditing ? (
              <div className="space-y-2">
                <Input
                  type="number"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="Monto"
                />
                <Input value={description} onChange={(e) => setDescription(e.target.value)} />
                <div className="flex flex-wrap gap-2">
                  <Input type="date" className="w-40" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
                  <Input
                    type="number"
                    step="0.01"
                    className="w-40"
                    placeholder="Beca/descuento"
                    value={discountAmount}
                    onChange={(e) => setDiscountAmount(e.target.value)}
                  />
                </div>
                <div className="flex gap-2">
                  <Button type="button" disabled={editCharge.isPending} onClick={() => saveEdit(charge.id)}>
                    Guardar
                  </Button>
                  <Button variant="ghost" type="button" onClick={() => setEditingId(null)}>
                    Cancelar
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">
                      {CONCEPT_LABELS[charge.concept] ?? charge.concept} — {studentName}
                      {sectionName ? ` (Sección ${sectionName})` : ''}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {charge.description} — vence {charge.dueDate}
                      {charge.discountAmount > 0
                        ? ` — $${charge.amount} (beca -$${charge.discountAmount}) → $${charge.netAmount}`
                        : ''}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">
                      {charge.paidAmount} / {charge.netAmount}
                    </p>
                    <span className={`text-xs uppercase ${STATUS_CLASSES[charge.status]}`}>
                      {STATUS_LABELS[charge.status]}
                    </span>
                  </div>
                </div>

                {canManage && charge.status !== 'anulado' && (
                  <div className="flex flex-wrap items-center gap-3">
                    {charge.status !== 'pagado' && (
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
                    <button
                      type="button"
                      className="text-xs text-muted-foreground underline hover:text-foreground"
                      onClick={() => startEditing(charge)}
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      className="text-xs text-destructive underline"
                      disabled={voidCharge.isPending}
                      onClick={() => voidCharge.mutate(charge.id)}
                    >
                      Anular
                    </button>
                  </div>
                )}

                <ChargePayments chargeId={charge.id} canManage={canManage} />
              </>
            )}
          </Card>
        );
      })}
    </ul>
  );
}
