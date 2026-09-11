import { NextRequest, NextResponse } from 'next/server';
import { serverApiFetch } from '@/lib/server-api';
import type { DocumentRequest } from '@eduapp/shared-types';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  const request = await serverApiFetch<DocumentRequest>(`/documents/requests/${params.id}/reject`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
  if (request === null) return NextResponse.json({ message: 'No se pudo rechazar' }, { status: 400 });
  return NextResponse.json(request);
}
