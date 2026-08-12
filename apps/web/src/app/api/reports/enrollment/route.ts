import { NextRequest, NextResponse } from 'next/server';
import { serverApiFetch } from '@/lib/server-api';
import type { EnrollmentReportRow } from '@eduapp/shared-types';

export async function GET(req: NextRequest) {
  const qs = req.nextUrl.searchParams.toString();
  const path = qs ? `/reports/enrollment?${qs}` : '/reports/enrollment';
  const rows = await serverApiFetch<EnrollmentReportRow[]>(path);
  if (rows === null) return NextResponse.json({ message: 'No autorizado' }, { status: 403 });
  return NextResponse.json(rows);
}
