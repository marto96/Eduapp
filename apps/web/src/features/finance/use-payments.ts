'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { Payment, PaymentMethod } from '@eduapp/shared-types';

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

export function useRecordPayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: recordPayment,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['charges'] }),
  });
}
