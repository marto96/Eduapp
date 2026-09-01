import { NextRequest, NextResponse } from 'next/server';
import { serverApiFetch } from '@/lib/server-api';
import type { AdmissionApplication } from '@eduapp/shared-types';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  const application = await serverApiFetch<AdmissionApplication>(
    `/admissions/applications/${params.id}/interview`,
    { method: 'PATCH', body: JSON.stringify(body) },
  );
  if (application === null) {
    return NextResponse.json({ message: 'No se pudo registrar la entrevista' }, { status: 400 });
  }
  return NextResponse.json(application);
}
