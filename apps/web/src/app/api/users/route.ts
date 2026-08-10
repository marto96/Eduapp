import { NextRequest, NextResponse } from 'next/server';
import { serverApiFetch } from '@/lib/server-api';
import type { TenantUser } from '@eduapp/shared-types';

export async function GET(req: NextRequest) {
  const role = req.nextUrl.searchParams.get('role');
  const path = role ? `/users?role=${encodeURIComponent(role)}` : '/users';
  const users = await serverApiFetch<TenantUser[]>(path);
  if (users === null) return NextResponse.json({ message: 'No autenticado' }, { status: 401 });
  return NextResponse.json(users);
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
