import { NextRequest, NextResponse } from 'next/server';
import { serverApiFetch } from '@/lib/server-api';
import type { Schedule } from '@eduapp/shared-types';

export async function GET(req: NextRequest) {
  const qs = req.nextUrl.searchParams.toString();
  const path = qs ? `/schedule?${qs}` : '/schedule';
  const schedules = await serverApiFetch<Schedule[]>(path);
  if (schedules === null) return NextResponse.json({ message: 'No autenticado' }, { status: 401 });
  return NextResponse.json(schedules);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const schedule = await serverApiFetch<Schedule>('/schedule', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  if (schedule === null) return NextResponse.json({ message: 'No se pudo crear' }, { status: 400 });
  return NextResponse.json(schedule, { status: 201 });
}
