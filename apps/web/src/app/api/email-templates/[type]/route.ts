import { NextRequest, NextResponse } from 'next/server';
import { serverApiFetch } from '@/lib/server-api';

export async function PATCH(req: NextRequest, { params }: { params: { type: string } }) {
  const body = await req.json();
  const result = await serverApiFetch(`/email-templates/${params.type}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
  if (result === null) {
    return NextResponse.json({ message: 'No se pudo actualizar la plantilla' }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
