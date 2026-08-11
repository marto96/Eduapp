import { NextResponse } from 'next/server';
import { serverApiFetch } from '@/lib/server-api';
import type { Announcement } from '@eduapp/shared-types';

export async function PATCH(_req: Request, { params }: { params: { id: string } }) {
  const announcement = await serverApiFetch<Announcement>(`/announcements/${params.id}/void`, {
    method: 'PATCH',
  });
  if (announcement === null) {
    return NextResponse.json({ message: 'No se pudo anular el comunicado' }, { status: 400 });
  }
  return NextResponse.json(announcement);
}
