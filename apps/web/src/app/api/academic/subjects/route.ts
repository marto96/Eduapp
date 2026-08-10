import { NextRequest, NextResponse } from 'next/server';
import { serverApiFetch } from '@/lib/server-api';
import type { Subject } from '@eduapp/shared-types';

export async function GET() {
  const subjects = await serverApiFetch<Subject[]>('/academic/subjects');
  if (subjects === null) return NextResponse.json({ message: 'No autenticado' }, { status: 401 });
  return NextResponse.json(subjects);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const subject = await serverApiFetch<Subject>('/academic/subjects', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  if (subject === null) return NextResponse.json({ message: 'No se pudo crear' }, { status: 400 });
  return NextResponse.json(subject, { status: 201 });
}
