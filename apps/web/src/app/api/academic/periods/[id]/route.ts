import { NextRequest, NextResponse } from 'next/server';
import { serverApiFetch } from '@/lib/server-api';
import type { Period } from '@eduapp/shared-types';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  const period = await serverApiFetch<Period>(`/academic/periods/${params.id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
  if (period === null) {
    return NextResponse.json({ message: 'No se pudo editar el periodo' }, { status: 400 });
  }
  return NextResponse.json(period);
}
