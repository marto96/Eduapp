import { NextRequest, NextResponse } from 'next/server';
import { serverApiFetch } from '@/lib/server-api';
import type { GuardianLink } from '@eduapp/shared-types';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const link = await serverApiFetch<GuardianLink>('/guardians/requests', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  if (link === null) {
    return NextResponse.json({ message: 'No se pudo enviar la solicitud' }, { status: 400 });
  }
  return NextResponse.json(link, { status: 201 });
}
