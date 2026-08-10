import { NextRequest, NextResponse } from 'next/server';
import { serverApiFetch } from '@/lib/server-api';
import type { Evaluation } from '@eduapp/shared-types';

export async function GET(req: NextRequest) {
  const qs = req.nextUrl.searchParams.toString();
  const path = qs ? `/grading/evaluations?${qs}` : '/grading/evaluations';
  const evaluations = await serverApiFetch<Evaluation[]>(path);
  if (evaluations === null) {
    return NextResponse.json({ message: 'No autenticado' }, { status: 401 });
  }
  return NextResponse.json(evaluations);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const evaluation = await serverApiFetch<Evaluation>('/grading/evaluations', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  if (evaluation === null) {
    return NextResponse.json({ message: 'No se pudo crear' }, { status: 400 });
  }
  return NextResponse.json(evaluation, { status: 201 });
}
