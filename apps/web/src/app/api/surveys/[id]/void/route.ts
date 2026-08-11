import { NextResponse } from 'next/server';
import { serverApiFetch } from '@/lib/server-api';
import type { Survey } from '@eduapp/shared-types';

export async function PATCH(_req: Request, { params }: { params: { id: string } }) {
  const survey = await serverApiFetch<Survey>(`/surveys/${params.id}/void`, {
    method: 'PATCH',
  });
  if (survey === null) {
    return NextResponse.json({ message: 'No se pudo anular la encuesta' }, { status: 400 });
  }
  return NextResponse.json(survey);
}
