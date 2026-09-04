import { NextRequest, NextResponse } from 'next/server';
import { serverApiFetch } from '@/lib/server-api';
import type { TenantUser } from '@eduapp/shared-types';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  const user = await serverApiFetch<TenantUser>(`/users/${params.id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
  if (user === null) {
    return NextResponse.json({ message: 'No se pudo editar el usuario' }, { status: 400 });
  }
  return NextResponse.json(user);
}
