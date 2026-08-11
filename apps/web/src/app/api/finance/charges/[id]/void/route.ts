import { NextResponse } from 'next/server';
import { serverApiFetch } from '@/lib/server-api';
import type { Charge } from '@eduapp/shared-types';

export async function PATCH(_req: Request, { params }: { params: { id: string } }) {
  const charge = await serverApiFetch<Charge>(`/finance/charges/${params.id}/void`, {
    method: 'PATCH',
  });
  if (charge === null) {
    return NextResponse.json({ message: 'No se pudo anular el cargo' }, { status: 400 });
  }
  return NextResponse.json(charge);
}
