import { NextRequest, NextResponse } from 'next/server';
import { serverApiFetch } from '@/lib/server-api';
import type { AdmissionApplication } from '@eduapp/shared-types';

export async function GET(req: NextRequest) {
  const status = req.nextUrl.searchParams.get('status');
  const path = status
    ? `/admissions/applications?status=${encodeURIComponent(status)}`
    : '/admissions/applications';
  const applications = await serverApiFetch<AdmissionApplication[]>(path);
  if (applications === null) return NextResponse.json({ message: 'No autenticado' }, { status: 401 });
  return NextResponse.json(applications);
}
