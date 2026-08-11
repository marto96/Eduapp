'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Payment, PaymentMethod } from '@eduapp/shared-types';

async function fetchPayments(chargeId: string): Promise<Payment[]> {
  const res = await fetch(`/api/finance/payments?chargeId=${chargeId}`);
  if (!res.ok) throw new Error('No se pudieron cargar los pagos');
  return res.json();
}

export interface RecordPaymentInput {
  chargeId: string;
  amount: number;
  method: PaymentMethod;
  paidAt: string;
  reference?: string;
}

async function recordPayment(input: RecordPaymentInput): Promise<Payment> {
  const res = await fetch('/api/finance/payments', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error('No se pudo registrar el pago');
  return res.json();
}

async function voidPayment(id: string): Promise<Payment> {
  const res = await fetch(`/api/finance/payments/${id}/void`, { method: 'PATCH' });
  if (!res.ok) throw new Error('No se pudo anular el pago');
  return res.json();
}

export function usePayments(chargeId: string) {
  return useQuery({
    queryKey: ['payments', chargeId],
    queryFn: () => fetchPayments(chargeId),
    enabled: !!chargeId,
  });
}

export function useRecordPayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: recordPayment,
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['charges'] });
      queryClient.invalidateQueries({ queryKey: ['payments', variables.chargeId] });
    },
  });
}

export function useVoidPayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: voidPayment,
    onSuccess: (payment) => {
      queryClient.invalidateQueries({ queryKey: ['charges'] });
      queryClient.invalidateQueries({ queryKey: ['payments', payment.chargeId] });
    },
  });
}
