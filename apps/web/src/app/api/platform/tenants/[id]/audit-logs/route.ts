import { NextRequest, NextResponse } from 'next/server';
import { platformApiFetch } from '@/lib/platform-api';
import type { AuditLog, PaginatedResult } from '@eduapp/shared-types';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const qs = req.nextUrl.searchParams.toString();
  const path = `/platform/tenants/${params.id}/audit-logs${qs ? `?${qs}` : ''}`;
  const result = await platformApiFetch<PaginatedResult<AuditLog>>(path);
  if (result === null) {
    return NextResponse.json({ message: 'No se pudieron cargar los logs de auditoría' }, { status: 401 });
  }
  return NextResponse.json(result);
}
