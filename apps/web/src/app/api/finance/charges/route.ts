import { NextRequest, NextResponse } from 'next/server';
import { serverApiFetch } from '@/lib/server-api';
import type { Charge } from '@eduapp/shared-types';

export async function GET(req: NextRequest) {
  const qs = req.nextUrl.searchParams.toString();
  const path = qs ? `/finance/charges?${qs}` : '/finance/charges';
  const charges = await serverApiFetch<Charge[]>(path);
  if (charges === null) return NextResponse.json({ message: 'No autenticado' }, { status: 401 });
  return NextResponse.json(charges);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const charge = await serverApiFetch<Charge>('/finance/charges', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  if (charge === null) return NextResponse.json({ message: 'No se pudo crear el cargo' }, { status: 400 });
  return NextResponse.json(charge, { status: 201 });
}
