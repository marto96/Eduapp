import { NextResponse } from 'next/server';
import { platformApiFetchWithStatus } from '@/lib/platform-api';
import type { TenantUser } from '@eduapp/shared-types';

export async function PATCH(_req: Request, { params }: { params: { id: string; userId: string } }) {
  const { status, body } = await platformApiFetchWithStatus<TenantUser>(
    `/platform/tenants/${params.id}/users/${params.userId}/reactivate`,
    { method: 'PATCH' },
  );
  if (status < 200 || status >= 300) {
    const message = (body as { message?: string } | null)?.message ?? 'No se pudo reactivar el usuario';
    return NextResponse.json({ message }, { status });
  }
  return NextResponse.json(body);
}
