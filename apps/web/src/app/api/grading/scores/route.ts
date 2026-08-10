import { NextRequest, NextResponse } from 'next/server';
import { serverApiFetch } from '@/lib/server-api';
import type { GradeScore } from '@eduapp/shared-types';

export async function GET(req: NextRequest) {
  const qs = req.nextUrl.searchParams.toString();
  const path = qs ? `/grading/scores?${qs}` : '/grading/scores';
  const scores = await serverApiFetch<GradeScore[]>(path);
  if (scores === null) return NextResponse.json({ message: 'No autenticado' }, { status: 401 });
  return NextResponse.json(scores);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const scores = await serverApiFetch<GradeScore[]>('/grading/scores', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  if (scores === null) {
    return NextResponse.json({ message: 'No se pudieron guardar las notas' }, { status: 400 });
  }
  return NextResponse.json(scores, { status: 201 });
}
