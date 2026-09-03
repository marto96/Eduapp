import { NextRequest, NextResponse } from 'next/server';
import { serverApiFetch } from '@/lib/server-api';
import type { GradeScore } from '@eduapp/shared-types';

export async function POST(req: NextRequest, { params }: { params: { enrollmentId: string } }) {
  const body = await req.json();
  const gradeScore = await serverApiFetch<GradeScore>(`/grading/gradebook/${params.enrollmentId}/grades`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
  if (gradeScore === null) {
    return NextResponse.json({ message: 'No se pudo guardar la nota' }, { status: 400 });
  }
  return NextResponse.json(gradeScore, { status: 201 });
}
