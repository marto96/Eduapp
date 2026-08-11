import { NextRequest, NextResponse } from 'next/server';
import { serverApiFetch } from '@/lib/server-api';
import type { Announcement } from '@eduapp/shared-types';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  const announcement = await serverApiFetch<Announcement>(`/announcements/${params.id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
  if (announcement === null) {
    return NextResponse.json({ message: 'No se pudo editar el comunicado' }, { status: 400 });
  }
  return NextResponse.json(announcement);
}
