import { NextRequest, NextResponse } from 'next/server';
import { serverApiFetch } from '@/lib/server-api';
import type { AcademicYear } from '@eduapp/shared-types';

/**
 * Proxy hacia el backend: el access token vive en una cookie httpOnly, así
 * que el navegador no puede llamar a la API de Nest directamente con el
 * header Authorization. Estas rutas lo agregan server-side.
 */
export async function GET() {
  const years = await serverApiFetch<AcademicYear[]>('/academic/years');
  if (years === null) return NextResponse.json({ message: 'No autenticado' }, { status: 401 });
  return NextResponse.json(years);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const year = await serverApiFetch<AcademicYear>('/academic/years', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  if (year === null) return NextResponse.json({ message: 'No se pudo crear' }, { status: 400 });
  return NextResponse.json(year, { status: 201 });
}
