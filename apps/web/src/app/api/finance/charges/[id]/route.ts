import { NextRequest, NextResponse } from 'next/server';
import { serverApiFetch } from '@/lib/server-api';
import type { Charge } from '@eduapp/shared-types';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  const charge = await serverApiFetch<Charge>(`/finance/charges/${params.id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
  if (charge === null) {
    return NextResponse.json({ message: 'No se pudo editar el cargo' }, { status: 400 });
  }
  return NextResponse.json(charge);
}
