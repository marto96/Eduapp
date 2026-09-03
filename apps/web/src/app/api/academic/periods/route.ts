import { NextRequest, NextResponse } from 'next/server';
import { serverApiFetch } from '@/lib/server-api';
import type { Period } from '@eduapp/shared-types';

export async function GET(req: NextRequest) {
  const qs = req.nextUrl.searchParams.toString();
  const path = qs ? `/academic/periods?${qs}` : '/academic/periods';
  const periods = await serverApiFetch<Period[]>(path);
  if (periods === null) {
    return NextResponse.json({ message: 'No autenticado' }, { status: 401 });
  }
  return NextResponse.json(periods);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const period = await serverApiFetch<Period>('/academic/periods', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  if (period === null) {
    return NextResponse.json({ message: 'No se pudo crear el periodo' }, { status: 400 });
  }
  return NextResponse.json(period, { status: 201 });
}
