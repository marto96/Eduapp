import { NextRequest, NextResponse } from 'next/server';
import { serverApiFetch } from '@/lib/server-api';
import type { GradebookResponse } from '@eduapp/shared-types';

export async function GET(_req: NextRequest, { params }: { params: { enrollmentId: string } }) {
  const gradebook = await serverApiFetch<GradebookResponse>(`/grading/gradebook/${params.enrollmentId}`);
  if (gradebook === null) {
    return NextResponse.json({ message: 'No se pudo cargar el boletín' }, { status: 400 });
  }
  return NextResponse.json(gradebook);
}
