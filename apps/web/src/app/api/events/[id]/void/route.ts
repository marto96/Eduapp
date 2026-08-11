import { NextResponse } from 'next/server';
import { serverApiFetch } from '@/lib/server-api';
import type { Event } from '@eduapp/shared-types';

export async function PATCH(_req: Request, { params }: { params: { id: string } }) {
  const event = await serverApiFetch<Event>(`/events/${params.id}/void`, {
    method: 'PATCH',
  });
  if (event === null) {
    return NextResponse.json({ message: 'No se pudo anular el evento' }, { status: 400 });
  }
  return NextResponse.json(event);
}
