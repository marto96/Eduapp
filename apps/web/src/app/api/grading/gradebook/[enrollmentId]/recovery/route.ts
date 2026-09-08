import { NextRequest, NextResponse } from 'next/server';
import { serverApiFetch } from '@/lib/server-api';
import type { GradeRecovery } from '@eduapp/shared-types';

export async function POST(req: NextRequest, { params }: { params: { enrollmentId: string } }) {
  const body = await req.json();
  const recovery = await serverApiFetch<GradeRecovery>(`/grading/gradebook/${params.enrollmentId}/recovery`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
  if (recovery === null) {
    return NextResponse.json({ message: 'No se pudo registrar la recuperación' }, { status: 400 });
  }
  return NextResponse.json(recovery, { status: 201 });
}
