import { NextRequest, NextResponse } from 'next/server';
import { serverApiFetch } from '@/lib/server-api';
import type { Payment } from '@eduapp/shared-types';

export async function GET(req: NextRequest) {
  const qs = req.nextUrl.searchParams.toString();
  const path = qs ? `/finance/payments?${qs}` : '/finance/payments';
  const payments = await serverApiFetch<Payment[]>(path);
  if (payments === null) return NextResponse.json({ message: 'No autenticado' }, { status: 401 });
  return NextResponse.json(payments);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const payment = await serverApiFetch<Payment>('/finance/payments', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  if (payment === null) {
    return NextResponse.json({ message: 'No se pudo registrar el pago' }, { status: 400 });
  }
  return NextResponse.json(payment, { status: 201 });
}
