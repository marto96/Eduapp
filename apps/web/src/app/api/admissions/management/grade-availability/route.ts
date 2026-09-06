import { NextRequest, NextResponse } from 'next/server';
import { serverApiFetch } from '@/lib/server-api';
import type { GradeAdmissionAvailability } from '@eduapp/shared-types';

export async function GET(req: NextRequest) {
  const qs = req.nextUrl.searchParams.toString();
  const result = await serverApiFetch<GradeAdmissionAvailability[]>(
    `/admissions/applications/grade-availability${qs ? `?${qs}` : ''}`,
  );
  if (result === null) return NextResponse.json({ message: 'No autenticado' }, { status: 401 });
  return NextResponse.json(result);
}
