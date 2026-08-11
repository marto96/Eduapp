import { NextResponse } from 'next/server';
import { serverApiFetch } from '@/lib/server-api';
import type { Payment } from '@eduapp/shared-types';

export async function PATCH(_req: Request, { params }: { params: { id: string } }) {
  const payment = await serverApiFetch<Payment>(`/finance/payments/${params.id}/void`, {
    method: 'PATCH',
  });
  if (payment === null) {
    return NextResponse.json({ message: 'No se pudo anular el pago' }, { status: 400 });
  }
  return NextResponse.json(payment);
}
