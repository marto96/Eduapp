import { NextRequest, NextResponse } from 'next/server';
import { serverApiFetch } from '@/lib/server-api';
import type { FeeSchedule } from '@eduapp/shared-types';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  const feeSchedule = await serverApiFetch<FeeSchedule>(`/finance/fee-schedules/${params.id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
  if (feeSchedule === null) {
    return NextResponse.json({ message: 'No se pudo editar el precio' }, { status: 400 });
  }
  return NextResponse.json(feeSchedule);
}
