import { NextRequest, NextResponse } from 'next/server';
import { serverApiFetch } from '@/lib/server-api';
import type { DocumentTypePrice } from '@eduapp/shared-types';

export async function PUT(req: NextRequest, { params }: { params: { type: string } }) {
  const body = await req.json();
  const price = await serverApiFetch<DocumentTypePrice>(`/documents/types/prices/${params.type}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
  if (price === null) return NextResponse.json({ message: 'No se pudo actualizar el precio' }, { status: 400 });
  return NextResponse.json(price);
}
