import { NextRequest, NextResponse } from 'next/server';
import { serverApiFetch } from '@/lib/server-api';

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const result = await serverApiFetch<{ checkoutUrl: string }>(`/finance/charges/${params.id}/checkout`, {
    method: 'POST',
  });
  if (result === null) {
    return NextResponse.json({ message: 'No se pudo iniciar el pago' }, { status: 400 });
  }
  return NextResponse.json(result);
}
