import { NextResponse } from 'next/server';
import { serverApiFetch } from '@/lib/server-api';
import type { SurveyResults } from '@eduapp/shared-types';

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const results = await serverApiFetch<SurveyResults>(`/surveys/${params.id}/results`);
  if (results === null) return NextResponse.json({ message: 'No autenticado' }, { status: 401 });
  return NextResponse.json(results);
}
