import { NextRequest, NextResponse } from 'next/server';
import { serverApiFetch } from '@/lib/server-api';
import type { Grade } from '@eduapp/shared-types';

export async function GET() {
  const grades = await serverApiFetch<Grade[]>('/academic/grades');
  if (grades === null) return NextResponse.json({ message: 'No autenticado' }, { status: 401 });
  return NextResponse.json(grades);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const grade = await serverApiFetch<Grade>('/academic/grades', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  if (grade === null) return NextResponse.json({ message: 'No se pudo crear' }, { status: 400 });
  return NextResponse.json(grade, { status: 201 });
}
