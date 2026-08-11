import { NextRequest, NextResponse } from 'next/server';
import { platformApiFetch } from '@/lib/platform-api';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const tenant = await platformApiFetch(`/platform/tenants/${params.id}`);
  if (tenant === null) return NextResponse.json({ message: 'No encontrada' }, { status: 404 });
  return NextResponse.json(tenant);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  const tenant = await platformApiFetch(`/platform/tenants/${params.id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
  if (tenant === null) {
    return NextResponse.json({ message: 'No se pudo editar la institución' }, { status: 400 });
  }
  return NextResponse.json(tenant);
}
