import { NextResponse } from 'next/server';
import { serverApiFetch } from '@/lib/server-api';

export async function PATCH(_req: Request, { params }: { params: { id: string } }) {
  const result = await serverApiFetch(`/hr/leaves/${params.id}/cancel`, { method: 'PATCH' });
  if (result === null) {
    return NextResponse.json({ message: 'No se pudo cancelar la licencia' }, { status: 400 });
  }
  return NextResponse.json(result);
}
