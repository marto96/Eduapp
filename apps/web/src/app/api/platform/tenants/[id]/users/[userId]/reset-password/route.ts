import { NextResponse } from 'next/server';
import { platformApiFetch } from '@/lib/platform-api';

export async function PATCH(_req: Request, { params }: { params: { id: string; userId: string } }) {
  const result = await platformApiFetch<{ temporaryPassword: string }>(
    `/platform/tenants/${params.id}/users/${params.userId}/reset-password`,
    { method: 'PATCH' },
  );
  if (result === null) return NextResponse.json({ message: 'No se pudo resetear la contraseña' }, { status: 400 });
  return NextResponse.json(result);
}
