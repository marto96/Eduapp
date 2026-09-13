import { NextRequest, NextResponse } from 'next/server';
import { serverApiFetch } from '@/lib/server-api';
import type { Classroom } from '@eduapp/shared-types';

export async function GET() {
  const classrooms = await serverApiFetch<Classroom[]>('/academic/classrooms');
  if (classrooms === null) return NextResponse.json({ message: 'No autenticado' }, { status: 401 });
  return NextResponse.json(classrooms);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const classroom = await serverApiFetch<Classroom>('/academic/classrooms', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  if (classroom === null) return NextResponse.json({ message: 'No se pudo crear' }, { status: 400 });
  return NextResponse.json(classroom, { status: 201 });
}
