import { NextResponse } from 'next/server';
import { serverApiFetch } from '@/lib/server-api';
import type { Loan } from '@eduapp/shared-types';

export async function PATCH(_req: Request, { params }: { params: { id: string } }) {
  const loan = await serverApiFetch<Loan>(`/library/loans/${params.id}/return`, {
    method: 'PATCH',
  });
  if (loan === null) {
    return NextResponse.json({ message: 'No se pudo registrar la devolución' }, { status: 400 });
  }
  return NextResponse.json(loan);
}
