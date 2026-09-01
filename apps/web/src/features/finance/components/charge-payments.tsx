'use client';

import { usePayments, useVoidPayment } from '../use-payments';
import { formatCurrency } from '@/lib/currency';

const METHOD_LABELS: Record<string, string> = {
  efectivo: 'Efectivo',
  transferencia: 'Transferencia',
  tarjeta: 'Tarjeta',
  otro: 'Otro',
};

export function ChargePayments({ chargeId, canManage }: { chargeId: string; canManage: boolean }) {
  const { data: payments } = usePayments(chargeId);
  const voidPayment = useVoidPayment();

  if (!payments || payments.length === 0) return null;

  return (
    <ul className="space-y-1 border-t border-border pt-2">
      {payments.map((payment) => (
        <li key={payment.id} className="flex items-center justify-between text-xs text-muted-foreground">
          <span className={payment.voidedAt ? 'line-through' : ''}>
            {METHOD_LABELS[payment.method] ?? payment.method} — {formatCurrency(payment.amount)} ({payment.paidAt})
            {payment.voidedAt && ' — anulado'}
          </span>
          {canManage && !payment.voidedAt && (
            <button
              type="button"
              className="text-destructive underline"
              disabled={voidPayment.isPending}
              onClick={() => voidPayment.mutate(payment.id)}
            >
              Anular pago
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}
