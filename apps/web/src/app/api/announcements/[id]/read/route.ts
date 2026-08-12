import { NextResponse } from 'next/server';
import { serverApiFetch } from '@/lib/server-api';

export async function PATCH(_req: Request, { params }: { params: { id: string } }) {
  const result = await serverApiFetch<{ ok: boolean }>(`/announcements/${params.id}/read`, {
    method: 'PATCH',
  });
  if (result === null) {
    return NextResponse.json({ message: 'No se pudo marcar como leído' }, { status: 400 });
  }
  return NextResponse.json(result);
}
