import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import type { DistributeSectionsResultRow } from '@eduapp/shared-types';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
const TENANT_SUBDOMAIN = process.env.NEXT_PUBLIC_TENANT_SUBDOMAIN ?? '';

/**
 * No usa `serverApiFetch` a propósito: esta ruta tiene varias validaciones
 * puntuales — grado/año/sección inexistentes, secciones repetidas, sin
 * matrículas activas — y `serverApiFetch` colapsa cualquier respuesta no-ok
 * a un mensaje genérico — mismo criterio que `reassign-section/route.ts`.
 */
export async function POST(req: NextRequest, { params }: { params: { gradeId: string } }) {
  const accessToken = cookies().get('access_token')?.value;
  if (!accessToken) {
    return NextResponse.json({ message: 'No autenticado' }, { status: 401 });
  }

  const body = await req.json();
  const apiRes = await fetch(`${API_URL}/enrollment/grades/${params.gradeId}/distribute-sections`, {
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
    const message = responseBody?.message ?? 'No se pudo repartir el grado';
    return NextResponse.json({ message }, { status: apiRes.status });
  }

  const result = (await apiRes.json()) as DistributeSectionsResultRow[];
  return NextResponse.json(result);
}
