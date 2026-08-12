import { NextRequest, NextResponse } from 'next/server';
import { serverApiFetch } from '@/lib/server-api';
import type { BankTransaction } from '@eduapp/shared-types';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  const transaction = await serverApiFetch<BankTransaction>(
    `/finance/bank-transactions/${params.id}/match`,
    { method: 'PATCH', body: JSON.stringify(body) },
  );
  if (transaction === null) {
    return NextResponse.json({ message: 'No se pudo conciliar la transacción' }, { status: 400 });
  }
  return NextResponse.json(transaction);
}
