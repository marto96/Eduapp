import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import type { VirtualRoom } from '@eduapp/shared-types';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
const TENANT_SUBDOMAIN = process.env.NEXT_PUBLIC_TENANT_SUBDOMAIN ?? '';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const accessToken = cookies().get('access_token')?.value;
  if (!accessToken) {
    return NextResponse.json({ message: 'No autenticado' }, { status: 401 });
  }

  const apiRes = await fetch(`${API_URL}/schedule/${params.id}/virtual-room`, {
    headers: {
      authorization: `Bearer ${accessToken}`,
      'x-tenant-subdomain': TENANT_SUBDOMAIN,
    },
    cache: 'no-store',
  });

  if (!apiRes.ok) {
    const responseBody = await apiRes.json().catch(() => null);
    const message = responseBody?.message ?? 'No se pudo obtener la sala';
    return NextResponse.json({ message }, { status: apiRes.status });
  }

  const room = (await apiRes.json()) as VirtualRoom;
  return NextResponse.json(room);
}
