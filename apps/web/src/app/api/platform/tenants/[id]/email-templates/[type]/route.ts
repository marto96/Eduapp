import { NextRequest, NextResponse } from 'next/server';
import { platformApiFetch } from '@/lib/platform-api';

export async function PATCH(req: NextRequest, { params }: { params: { id: string; type: string } }) {
  const body = await req.json();
  const result = await platformApiFetch(`/platform/tenants/${params.id}/email-templates/${params.type}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
  if (result === null) {
    return NextResponse.json({ message: 'No se pudo actualizar la plantilla' }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
