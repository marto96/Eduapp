import { NextResponse } from 'next/server';
import { platformApiFetchWithStatus } from '@/lib/platform-api';

export async function PATCH(_req: Request, { params }: { params: { id: string; userId: string } }) {
  const { status, body } = await platformApiFetchWithStatus<{ temporaryPassword: string }>(
    `/platform/tenants/${params.id}/users/${params.userId}/reset-password`,
    { method: 'PATCH' },
  );
  if (status < 200 || status >= 300) {
    const message = (body as { message?: string } | null)?.message ?? 'No se pudo resetear la contraseña';
    return NextResponse.json({ message }, { status });
  }
  return NextResponse.json(body);
}
