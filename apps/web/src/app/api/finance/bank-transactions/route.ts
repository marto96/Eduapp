import { NextRequest, NextResponse } from 'next/server';
import { serverApiFetch } from '@/lib/server-api';
import type { BankTransaction } from '@eduapp/shared-types';

export async function GET(req: NextRequest) {
  const qs = req.nextUrl.searchParams.toString();
  const path = qs ? `/finance/bank-transactions?${qs}` : '/finance/bank-transactions';
  const transactions = await serverApiFetch<BankTransaction[]>(path);
  if (transactions === null) return NextResponse.json({ message: 'No autenticado' }, { status: 401 });
  return NextResponse.json(transactions);
}
