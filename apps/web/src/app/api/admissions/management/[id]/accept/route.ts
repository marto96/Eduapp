import { NextRequest, NextResponse } from 'next/server';
import { serverApiFetch } from '@/lib/server-api';
import type { AdmissionAcceptResponse } from '@eduapp/shared-types';

export async function PATCH(_req: NextRequest, { params }: { params: { id: string } }) {
  const result = await serverApiFetch<AdmissionAcceptResponse>(
    `/admissions/applications/${params.id}/accept`,
    { method: 'PATCH' },
  );
  if (result === null) {
    return NextResponse.json({ message: 'No se pudo aceptar la solicitud' }, { status: 400 });
  }
  return NextResponse.json(result);
}
