import { NextRequest, NextResponse } from 'next/server';
import { serverApiFetch } from '@/lib/server-api';
import type { Loan } from '@eduapp/shared-types';

export async function GET() {
  const loans = await serverApiFetch<Loan[]>('/library/loans');
  if (loans === null) return NextResponse.json({ message: 'No autenticado' }, { status: 401 });
  return NextResponse.json(loans);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const loan = await serverApiFetch<Loan>('/library/loans', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  if (loan === null) {
    return NextResponse.json({ message: 'No se pudo registrar el préstamo' }, { status: 400 });
  }
  return NextResponse.json(loan, { status: 201 });
}
