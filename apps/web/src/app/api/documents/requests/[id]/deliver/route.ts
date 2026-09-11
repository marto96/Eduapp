import { NextResponse } from 'next/server';
import { serverApiFetch } from '@/lib/server-api';
import type { DocumentRequest } from '@eduapp/shared-types';

export async function PATCH(_req: Request, { params }: { params: { id: string } }) {
  const request = await serverApiFetch<DocumentRequest>(`/documents/requests/${params.id}/deliver`, {
    method: 'PATCH',
  });
  if (request === null) return NextResponse.json({ message: 'No se pudo marcar como entregada' }, { status: 400 });
  return NextResponse.json(request);
}
