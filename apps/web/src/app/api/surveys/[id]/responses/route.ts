import { NextRequest, NextResponse } from 'next/server';
import { serverApiFetch } from '@/lib/server-api';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  const response = await serverApiFetch(`/surveys/${params.id}/responses`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
  if (response === null) {
    return NextResponse.json({ message: 'No se pudo enviar la respuesta' }, { status: 400 });
  }
  return NextResponse.json(response, { status: 201 });
}
