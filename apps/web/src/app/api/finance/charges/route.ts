import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { serverApiFetch } from '@/lib/server-api';
import type { Charge, PaginatedResult } from '@eduapp/shared-types';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
const TENANT_SUBDOMAIN = process.env.NEXT_PUBLIC_TENANT_SUBDOMAIN ?? '';

export async function GET(req: NextRequest) {
  const qs = req.nextUrl.searchParams.toString();
  const path = qs ? `/finance/charges?${qs}` : '/finance/charges';
  const charges = await serverApiFetch<Charge[] | PaginatedResult<Charge>>(path);
  if (charges === null) return NextResponse.json({ message: 'No autenticado' }, { status: 401 });
  return NextResponse.json(charges);
}

/**
 * No usa `serverApiFetch` a propósito: colapsa cualquier respuesta no-ok a
 * `null`, así que un `ConflictException` puntual (ej. matrícula/pensión
 * duplicada) nunca llegaría a la UI. Mismo patrón que `api/enrollments/route.ts`.
 */
export async function POST(req: NextRequest) {
  const accessToken = cookies().get('access_token')?.value;
  if (!accessToken) {
    return NextResponse.json({ message: 'No autenticado' }, { status: 401 });
  }

  const body = await req.json();
  const apiRes = await fetch(`${API_URL}/finance/charges`, {
    method: 'POST',
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
    const message = responseBody?.message ?? 'No se pudo crear el cargo';
    return NextResponse.json({ message }, { status: apiRes.status });
  }

  const charge = (await apiRes.json()) as Charge;
  return NextResponse.json(charge, { status: 201 });
}
