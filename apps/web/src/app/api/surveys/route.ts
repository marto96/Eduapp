import { NextRequest, NextResponse } from 'next/server';
import { serverApiFetch } from '@/lib/server-api';
import type { Survey } from '@eduapp/shared-types';

export async function GET() {
  const surveys = await serverApiFetch<Survey[]>('/surveys');
  if (surveys === null) return NextResponse.json({ message: 'No autenticado' }, { status: 401 });
  return NextResponse.json(surveys);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const survey = await serverApiFetch<Survey>('/surveys', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  if (survey === null) {
    return NextResponse.json({ message: 'No se pudo crear la encuesta' }, { status: 400 });
  }
  return NextResponse.json(survey, { status: 201 });
}
