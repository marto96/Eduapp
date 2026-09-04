import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { serverApiFetch } from '@/lib/server-api';
import type { AcademicYear } from '@eduapp/shared-types';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
const TENANT_SUBDOMAIN = process.env.NEXT_PUBLIC_TENANT_SUBDOMAIN ?? '';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  const year = await serverApiFetch<AcademicYear>(`/academic/years/${params.id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
  if (year === null) {
    return NextResponse.json({ message: 'No se pudo editar el año lectivo' }, { status: 400 });
  }
  return NextResponse.json(year);
}

// DELETE no usa serverApiFetch: el backend responde 204 sin body, y
// `res.json()` sobre un body vacío tira una excepción de parseo.
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const accessToken = cookies().get('access_token')?.value;
  if (!accessToken) {
    return NextResponse.json({ message: 'No autenticado' }, { status: 401 });
  }

  const apiRes = await fetch(`${API_URL}/academic/years/${params.id}`, {
    method: 'DELETE',
    headers: {
      authorization: `Bearer ${accessToken}`,
      'x-tenant-subdomain': TENANT_SUBDOMAIN,
    },
    cache: 'no-store',
  });

  if (!apiRes.ok) {
    const responseBody = await apiRes.json().catch(() => null);
    const message = responseBody?.message ?? 'No se pudo eliminar el año lectivo';
    return NextResponse.json({ message }, { status: apiRes.status });
  }

  return NextResponse.json({ ok: true });
}
