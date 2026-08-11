import { NextRequest, NextResponse } from 'next/server';
import { serverApiFetch } from '@/lib/server-api';
import type { Event } from '@eduapp/shared-types';

export async function GET() {
  const events = await serverApiFetch<Event[]>('/events');
  if (events === null) return NextResponse.json({ message: 'No autenticado' }, { status: 401 });
  return NextResponse.json(events);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const event = await serverApiFetch<Event>('/events', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  if (event === null) {
    return NextResponse.json({ message: 'No se pudo crear el evento' }, { status: 400 });
  }
  return NextResponse.json(event, { status: 201 });
}
