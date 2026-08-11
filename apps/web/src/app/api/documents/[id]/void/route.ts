import { NextResponse } from 'next/server';
import { serverApiFetch } from '@/lib/server-api';
import type { IssuedDocument } from '@eduapp/shared-types';

export async function PATCH(_req: Request, { params }: { params: { id: string } }) {
  const document = await serverApiFetch<IssuedDocument>(`/documents/${params.id}/void`, {
    method: 'PATCH',
  });
  if (document === null) {
    return NextResponse.json({ message: 'No se pudo anular el documento' }, { status: 400 });
  }
  return NextResponse.json(document);
}
