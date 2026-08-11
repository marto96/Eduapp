import { NextRequest, NextResponse } from 'next/server';
import { serverApiFetch } from '@/lib/server-api';
import type { Survey } from '@eduapp/shared-types';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  const survey = await serverApiFetch<Survey>(`/surveys/${params.id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
  if (survey === null) {
    return NextResponse.json({ message: 'No se pudo actualizar la encuesta' }, { status: 400 });
  }
  return NextResponse.json(survey);
}
