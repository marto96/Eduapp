import { NextRequest, NextResponse } from 'next/server';
import { platformApiFetch } from '@/lib/platform-api';

export async function GET() {
  const tenants = await platformApiFetch('/platform/tenants');
  if (tenants === null) return NextResponse.json({ message: 'No autorizado' }, { status: 403 });
  return NextResponse.json(tenants);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const tenant = await platformApiFetch('/platform/tenants', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  if (tenant === null) {
    return NextResponse.json({ message: 'No se pudo crear la institución' }, { status: 400 });
  }
  return NextResponse.json(tenant, { status: 201 });
}
