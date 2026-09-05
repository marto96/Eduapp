import { NextRequest, NextResponse } from 'next/server';
import { serverApiFetch } from '@/lib/server-api';
import type { AcademicYear } from '@eduapp/shared-types';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  const year = await serverApiFetch<AcademicYear>(`/academic/years/${params.id}/admissions`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
  if (year === null) {
    return NextResponse.json({ message: 'No se pudo actualizar las admisiones de ese año' }, { status: 400 });
  }
  return NextResponse.json(year);
}
