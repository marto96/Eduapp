import { NextRequest, NextResponse } from 'next/server';
import { platformApiFetchWithStatus } from '@/lib/platform-api';
import type { TenantUser } from '@eduapp/shared-types';

export async function PATCH(req: NextRequest, { params }: { params: { id: string; userId: string } }) {
  const reqBody = await req.json();
  const { status, body } = await platformApiFetchWithStatus<TenantUser>(
    `/platform/tenants/${params.id}/users/${params.userId}`,
    { method: 'PATCH', body: JSON.stringify(reqBody) },
  );
  if (status < 200 || status >= 300) {
    const message = (body as { message?: string } | null)?.message ?? 'No se pudo editar el usuario';
    return NextResponse.json({ message }, { status });
  }
  return NextResponse.json(body);
}
