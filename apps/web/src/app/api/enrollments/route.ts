import { NextRequest, NextResponse } from 'next/server';
import { serverApiFetch } from '@/lib/server-api';
import type { Enrollment } from '@eduapp/shared-types';

export async function GET(req: NextRequest) {
  const qs = req.nextUrl.searchParams.toString();
  const path = qs ? `/enrollments?${qs}` : '/enrollments';
  const enrollments = await serverApiFetch<Enrollment[]>(path);
  if (enrollments === null) {
    return NextResponse.json({ message: 'No autenticado' }, { status: 401 });
  }
  return NextResponse.json(enrollments);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const enrollment = await serverApiFetch<Enrollment>('/enrollments', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  if (enrollment === null) {
    return NextResponse.json({ message: 'No se pudo matricular' }, { status: 400 });
  }
  return NextResponse.json(enrollment, { status: 201 });
}
