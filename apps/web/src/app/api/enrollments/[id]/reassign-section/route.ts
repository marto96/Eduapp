import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import type { Enrollment } from '@eduapp/shared-types';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
const TENANT_SUBDOMAIN = process.env.NEXT_PUBLIC_TENANT_SUBDOMAIN ?? '';

/**
 * No usa `serverApiFetch` a propósito: esta ruta tiene varias validaciones
 * puntuales (matrícula no activa, sección de otro grado) y ese helper
 * colapsa cualquier respuesta no-ok a un mensaje genérico — mismo criterio
 * que `api/enrollments/route.ts` (POST).
 */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const accessToken = cookies().get('access_token')?.value;
  if (!accessToken) {
    return NextResponse.json({ message: 'No autenticado' }, { status: 401 });
  }

  const body = await req.json();
  const apiRes = await fetch(`${API_URL}/enrollments/${params.id}/reassign-section`, {
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
    const message = responseBody?.message ?? 'No se pudo reubicar la matrícula';
    return NextResponse.json({ message }, { status: apiRes.status });
  }

  const enrollment = (await apiRes.json()) as Enrollment;
  return NextResponse.json(enrollment);
}
