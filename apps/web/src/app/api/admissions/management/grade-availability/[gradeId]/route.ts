import { NextRequest, NextResponse } from 'next/server';
import { serverApiFetch } from '@/lib/server-api';

export async function PATCH(req: NextRequest, { params }: { params: { gradeId: string } }) {
  const body = await req.json();
  const result = await serverApiFetch<{ gradeId: string; academicYearId: string; closed: boolean }>(
    `/admissions/applications/grade-availability/${params.gradeId}`,
    { method: 'PATCH', body: JSON.stringify(body) },
  );
  if (result === null) {
    return NextResponse.json({ message: 'No se pudo actualizar el cupo de ese grado' }, { status: 400 });
  }
  return NextResponse.json(result);
}
