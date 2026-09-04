import { NextRequest, NextResponse } from 'next/server';
import { serverApiFetch } from '@/lib/server-api';
import type { AdmissionApplication, PaginatedResult } from '@eduapp/shared-types';

export async function GET(req: NextRequest) {
  const qs = req.nextUrl.searchParams.toString();
  const path = `/admissions/applications${qs ? `?${qs}` : ''}`;
  const result = await serverApiFetch<PaginatedResult<AdmissionApplication>>(path);
  if (result === null) return NextResponse.json({ message: 'No autenticado' }, { status: 401 });
  return NextResponse.json(result);
}
