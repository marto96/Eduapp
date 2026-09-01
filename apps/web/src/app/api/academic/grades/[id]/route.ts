import { NextRequest, NextResponse } from 'next/server';
import { serverApiFetch } from '@/lib/server-api';
import type { Grade } from '@eduapp/shared-types';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  const grade = await serverApiFetch<Grade>(`/academic/grades/${params.id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
  if (grade === null) {
    return NextResponse.json({ message: 'No se pudo editar el grado' }, { status: 400 });
  }
  return NextResponse.json(grade);
}
