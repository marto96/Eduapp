import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { serverApiFetch } from '@/lib/server-api';
import type { Enrollment, PaginatedResult } from '@eduapp/shared-types';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
const TENANT_SUBDOMAIN = process.env.NEXT_PUBLIC_TENANT_SUBDOMAIN ?? '';

export async function GET(req: NextRequest) {
  const qs = req.nextUrl.searchParams.toString();
  const path = qs ? `/enrollments?${qs}` : '/enrollments';
  const enrollments = await serverApiFetch<Enrollment[] | PaginatedResult<Enrollment>>(path);
  if (enrollments === null) {
    return NextResponse.json({ message: 'No autenticado' }, { status: 401 });
  }
  return NextResponse.json(enrollments);
}

/**
 * No usa `serverApiFetch` a propósito: ese helper colapsa cualquier
 * respuesta no-ok del backend a `null`, así que un `ConflictException` con
 * un motivo puntual (ej. cartera vencida) nunca llegaría a la UI. Mismo
 * patrón que ya usa `api/auth/login/route.ts` — fetch directo, se propaga
 * el `message` y el status real del backend.
 */
export async function POST(req: NextRequest) {
  const accessToken = cookies().get('access_token')?.value;
  if (!accessToken) {
    return NextResponse.json({ message: 'No autenticado' }, { status: 401 });
  }

  const body = await req.json();
  const apiRes = await fetch(`${API_URL}/enrollments`, {
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
    const message = responseBody?.message ?? 'No se pudo matricular';
    return NextResponse.json({ message }, { status: apiRes.status });
  }

  const enrollment = (await apiRes.json()) as Enrollment;
  return NextResponse.json(enrollment, { status: 201 });
}
