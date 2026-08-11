import { NextRequest, NextResponse } from 'next/server';
import { serverApiFetch } from '@/lib/server-api';
import type { Event } from '@eduapp/shared-types';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  const event = await serverApiFetch<Event>(`/events/${params.id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
  if (event === null) {
    return NextResponse.json({ message: 'No se pudo editar el evento' }, { status: 400 });
  }
  return NextResponse.json(event);
}
