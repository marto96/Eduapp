import { NextRequest, NextResponse } from 'next/server';
import { serverApiFetch } from '@/lib/server-api';
import type { Announcement } from '@eduapp/shared-types';

export async function GET(req: NextRequest) {
  const qs = req.nextUrl.searchParams.toString();
  const path = qs ? `/announcements?${qs}` : '/announcements';
  const announcements = await serverApiFetch<Announcement[]>(path);
  if (announcements === null) return NextResponse.json({ message: 'No autenticado' }, { status: 401 });
  return NextResponse.json(announcements);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const announcement = await serverApiFetch<Announcement>('/announcements', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  if (announcement === null) {
    return NextResponse.json({ message: 'No se pudo publicar el comunicado' }, { status: 400 });
  }
  return NextResponse.json(announcement, { status: 201 });
}
