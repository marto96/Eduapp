import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import type { Charge } from '@eduapp/shared-types';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
const TENANT_SUBDOMAIN = process.env.NEXT_PUBLIC_TENANT_SUBDOMAIN ?? '';

// Fetch directo (no `serverApiFetch`): un cargo de pensión editado hacia un
// mes con otra pensión ya cargada devuelve un `ConflictException` puntual —
// `serverApiFetch` lo colapsaría a un mensaje genérico.
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const accessToken = cookies().get('access_token')?.value;
  if (!accessToken) {
    return NextResponse.json({ message: 'No autenticado' }, { status: 401 });
  }

  const body = await req.json();
  const apiRes = await fetch(`${API_URL}/finance/charges/${params.id}`, {
    method: 'PATCH',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${accessToken}`,
      'x-tenant-subdomain': TENANT_SUBDOMAIN,
    },
    body: JSON.stringify(body),
    cache: 'no-store',
  });

  if (!apiRes.ok) {
    const responseBody = await apiRes.json().catch(() => null);
    const message = responseBody?.message ?? 'No se pudo editar el cargo';
    return NextResponse.json({ message }, { status: apiRes.status });
  }

  const charge = (await apiRes.json()) as Charge;
  return NextResponse.json(charge);
}
