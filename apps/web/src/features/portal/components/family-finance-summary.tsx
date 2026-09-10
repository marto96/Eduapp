'use client';

import { Card } from '@/components/ui/card';
import { formatCurrency } from '@/lib/currency';
import type { Charge, Enrollment } from '@eduapp/shared-types';

/**
 * Solo cargos pendientes/parciales cuentan como deuda — 'pagado' y
 * 'anulado' ya no representan plata que el guardián deba.
 */
function isOwed(charge: Charge): boolean {
  return charge.status === 'pendiente' || charge.status === 'parcial';
}

export function FamilyFinanceSummary({
  enrollments,
  charges,
  studentNameById,
}: {
  enrollments: Enrollment[];
  charges: Charge[];
  studentNameById: Map<string, string>;
}) {
  const total = charges.filter(isOwed).reduce((sum, c) => sum + c.balance, 0);

  const owedByEnrollment = enrollments.map((enrollment) => {
    const owed = charges
      .filter((c) => c.enrollmentId === enrollment.id && isOwed(c))
      .reduce((sum, c) => sum + c.balance, 0);
    return { enrollment, owed };
  });

  return (
    <Card>
      <p className="text-[10px] uppercase tracking-wide text-primary">Total adeudado</p>
      <p className="mt-1 text-2xl font-medium">{formatCurrency(total)}</p>
      <ul className="mt-3 space-y-1 text-sm">
        {owedByEnrollment.map(({ enrollment, owed }) => (
          <li key={enrollment.id} className="flex items-center justify-between">
            <span className="text-muted-foreground">
              {studentNameById.get(enrollment.studentId) ?? 'Mi matrícula'}
            </span>
            <span className={owed > 0 ? 'text-destructive' : 'text-muted-foreground'}>
              {owed > 0 ? formatCurrency(owed) : 'Al día'}
            </span>
          </li>
        ))}
      </ul>
    </Card>
  );
}
