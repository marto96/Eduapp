import { NextResponse } from 'next/server';
import { serverApiFetch } from '@/lib/server-api';
import type { Enrollment } from '@eduapp/shared-types';

export async function PATCH(_req: Request, { params }: { params: { id: string } }) {
  const enrollment = await serverApiFetch<Enrollment>(`/enrollments/${params.id}/complete`, {
    method: 'PATCH',
  });
  if (enrollment === null) {
    return NextResponse.json({ message: 'No se pudo completar la matrícula' }, { status: 400 });
  }
  return NextResponse.json(enrollment);
}
