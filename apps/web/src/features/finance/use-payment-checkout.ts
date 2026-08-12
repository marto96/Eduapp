'use client';

import { useMutation } from '@tanstack/react-query';

async function createCheckout(chargeId: string): Promise<{ checkoutUrl: string }> {
  const res = await fetch(`/api/finance/charges/${chargeId}/checkout`, { method: 'POST' });
  if (!res.ok) throw new Error('No se pudo iniciar el pago');
  return res.json();
}

export function usePaymentCheckout() {
  return useMutation({
    mutationFn: createCheckout,
    onSuccess: ({ checkoutUrl }) => {
      window.location.href = checkoutUrl;
    },
  });
}
