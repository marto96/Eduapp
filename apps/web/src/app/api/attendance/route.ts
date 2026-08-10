import { NextRequest, NextResponse } from 'next/server';
import { serverApiFetch } from '@/lib/server-api';
import type { AttendanceRecord } from '@eduapp/shared-types';

export async function GET(req: NextRequest) {
  const qs = req.nextUrl.searchParams.toString();
  const path = qs ? `/attendance?${qs}` : '/attendance';
  const records = await serverApiFetch<AttendanceRecord[]>(path);
  if (records === null) return NextResponse.json({ message: 'No autenticado' }, { status: 401 });
  return NextResponse.json(records);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const records = await serverApiFetch<AttendanceRecord[]>('/attendance', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  if (records === null) {
    return NextResponse.json({ message: 'No se pudo guardar la asistencia' }, { status: 400 });
  }
  return NextResponse.json(records, { status: 201 });
}
