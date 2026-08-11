import { NextRequest, NextResponse } from 'next/server';
import { serverApiFetch } from '@/lib/server-api';
import type { Message } from '@eduapp/shared-types';

export async function GET() {
  const messages = await serverApiFetch<Message[]>('/messages');
  if (messages === null) return NextResponse.json({ message: 'No autenticado' }, { status: 401 });
  return NextResponse.json(messages);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const message = await serverApiFetch<Message>('/messages', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  if (message === null) {
    return NextResponse.json({ message: 'No se pudo enviar el mensaje' }, { status: 400 });
  }
  return NextResponse.json(message, { status: 201 });
}
