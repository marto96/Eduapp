import { NextRequest, NextResponse } from 'next/server';
import { serverApiFetch } from '@/lib/server-api';
import type { FinanceReportRow } from '@eduapp/shared-types';

export async function GET(req: NextRequest) {
  const qs = req.nextUrl.searchParams.toString();
  const path = qs ? `/reports/finance?${qs}` : '/reports/finance';
  const rows = await serverApiFetch<FinanceReportRow[]>(path);
  if (rows === null) return NextResponse.json({ message: 'No autorizado' }, { status: 403 });
  return NextResponse.json(rows);
}
