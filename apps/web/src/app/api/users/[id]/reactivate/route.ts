import { NextRequest, NextResponse } from 'next/server';
import { serverApiFetch } from '@/lib/server-api';
import type { TenantUser } from '@eduapp/shared-types';

export async function PATCH(_req: NextRequest, { params }: { params: { id: string } }) {
  const user = await serverApiFetch<TenantUser>(`/users/${params.id}/reactivate`, { method: 'PATCH' });
  if (user === null) {
    return NextResponse.json({ message: 'No se pudo reactivar el usuario' }, { status: 400 });
  }
  return NextResponse.json(user);
}
