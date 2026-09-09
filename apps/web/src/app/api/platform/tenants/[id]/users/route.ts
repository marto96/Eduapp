import { NextRequest, NextResponse } from 'next/server';
import { platformApiFetch } from '@/lib/platform-api';
import type { PaginatedResult, TenantUser } from '@eduapp/shared-types';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const qs = req.nextUrl.searchParams.toString();
  const result = await platformApiFetch<PaginatedResult<TenantUser>>(
    `/platform/tenants/${params.id}/users${qs ? `?${qs}` : ''}`,
  );
  if (result === null) return NextResponse.json({ message: 'No se pudieron cargar los usuarios' }, { status: 400 });
  return NextResponse.json(result);
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  const user = await platformApiFetch<TenantUser>(`/platform/tenants/${params.id}/users`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
  if (user === null) return NextResponse.json({ message: 'No se pudo crear el usuario' }, { status: 400 });
  return NextResponse.json(user, { status: 201 });
}
