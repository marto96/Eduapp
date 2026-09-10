import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, serverApiFetch } from '@/lib/server-api';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ message: 'No autenticado' }, { status: 401 });
  }
  return NextResponse.json(user);
}

export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const user = await serverApiFetch('/auth/me', {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
  if (user === null) {
    return NextResponse.json({ message: 'No se pudo actualizar el perfil' }, { status: 400 });
  }
  return NextResponse.json(user);
}
