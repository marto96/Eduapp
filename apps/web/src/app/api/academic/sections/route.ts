import { NextRequest, NextResponse } from 'next/server';
import { serverApiFetch } from '@/lib/server-api';
import type { Section } from '@eduapp/shared-types';

export async function GET() {
  const sections = await serverApiFetch<Section[]>('/academic/sections');
  if (sections === null) return NextResponse.json({ message: 'No autenticado' }, { status: 401 });
  return NextResponse.json(sections);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const section = await serverApiFetch<Section>('/academic/sections', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  if (section === null) return NextResponse.json({ message: 'No se pudo crear' }, { status: 400 });
  return NextResponse.json(section, { status: 201 });
}
