import { NextRequest, NextResponse } from 'next/server';
import { serverApiFetch } from '@/lib/server-api';
import type { PaginatedResult, TenantUser } from '@eduapp/shared-types';

export async function GET(req: NextRequest) {
  const qs = req.nextUrl.searchParams.toString();
  const result = await serverApiFetch<PaginatedResult<TenantUser>>(`/users${qs ? `?${qs}` : ''}`);
  if (result === null) return NextResponse.json({ message: 'No autenticado' }, { status: 401 });
  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const user = await serverApiFetch<TenantUser>('/users', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  if (user === null) return NextResponse.json({ message: 'No se pudo crear' }, { status: 400 });
  return NextResponse.json(user, { status: 201 });
}
