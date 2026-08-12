import { NextResponse } from 'next/server';
import { serverApiFetch } from '@/lib/server-api';

export async function PATCH(_req: Request, { params }: { params: { id: string } }) {
  const result = await serverApiFetch<{ temporaryPassword: string }>(
    `/users/${params.id}/reset-password`,
    { method: 'PATCH' },
  );
  if (result === null) return NextResponse.json({ message: 'No autorizado' }, { status: 403 });
  return NextResponse.json(result);
}
