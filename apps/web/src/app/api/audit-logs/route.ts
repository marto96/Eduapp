import { NextRequest, NextResponse } from 'next/server';
import { serverApiFetch } from '@/lib/server-api';
import type { AuditLog, PaginatedResult } from '@eduapp/shared-types';

export async function GET(req: NextRequest) {
  const qs = req.nextUrl.searchParams.toString();
  const path = qs ? `/audit-logs?${qs}` : '/audit-logs';
  const result = await serverApiFetch<PaginatedResult<AuditLog>>(path);
  if (result === null) {
    return NextResponse.json({ message: 'No autenticado' }, { status: 401 });
  }
  return NextResponse.json(result);
}
