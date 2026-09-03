import { NextRequest, NextResponse } from 'next/server';
import { serverApiFetch } from '@/lib/server-api';
import type { SubjectPeriodDetailResponse } from '@eduapp/shared-types';

export async function GET(req: NextRequest, { params }: { params: { enrollmentId: string } }) {
  const qs = req.nextUrl.searchParams.toString();
  const detail = await serverApiFetch<SubjectPeriodDetailResponse>(
    `/grading/gradebook/${params.enrollmentId}/subject-period?${qs}`,
  );
  if (detail === null) {
    return NextResponse.json({ message: 'No se pudo cargar el detalle' }, { status: 400 });
  }
  return NextResponse.json(detail);
}
