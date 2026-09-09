import { NextRequest, NextResponse } from 'next/server';
import { platformApiFetch } from '@/lib/platform-api';
import type { TenantUser } from '@eduapp/shared-types';

export async function PATCH(req: NextRequest, { params }: { params: { id: string; userId: string } }) {
  const body = await req.json();
  const user = await platformApiFetch<TenantUser>(`/platform/tenants/${params.id}/users/${params.userId}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
  if (user === null) return NextResponse.json({ message: 'No se pudo editar el usuario' }, { status: 400 });
  return NextResponse.json(user);
}
