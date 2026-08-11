import { NextResponse } from 'next/server';
import { serverApiFetch } from '@/lib/server-api';
import type { GuardianLink } from '@eduapp/shared-types';

export async function PATCH(_req: Request, { params }: { params: { id: string } }) {
  const link = await serverApiFetch<GuardianLink>(`/guardians/${params.id}/approve`, {
    method: 'PATCH',
  });
  if (link === null) {
    return NextResponse.json({ message: 'No se pudo aprobar el vínculo' }, { status: 400 });
  }
  return NextResponse.json(link);
}
