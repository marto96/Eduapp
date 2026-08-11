import { NextRequest, NextResponse } from 'next/server';
import { serverApiFetch } from '@/lib/server-api';
import type { Message } from '@eduapp/shared-types';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  const message = await serverApiFetch<Message>(`/messages/${params.id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
  if (message === null) {
    return NextResponse.json({ message: 'No se pudo editar el mensaje' }, { status: 400 });
  }
  return NextResponse.json(message);
}
