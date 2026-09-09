import { NextResponse } from 'next/server';
import { platformApiFetch } from '@/lib/platform-api';
import type { TenantUser } from '@eduapp/shared-types';

export async function PATCH(_req: Request, { params }: { params: { id: string; userId: string } }) {
  const user = await platformApiFetch<TenantUser>(
    `/platform/tenants/${params.id}/users/${params.userId}/deactivate`,
    { method: 'PATCH' },
  );
  if (user === null) return NextResponse.json({ message: 'No se pudo inactivar el usuario' }, { status: 400 });
  return NextResponse.json(user);
}
