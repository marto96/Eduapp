import { NextRequest, NextResponse } from 'next/server';
import { serverApiFetch } from '@/lib/server-api';
import type { IssuedDocument } from '@eduapp/shared-types';

export async function GET(req: NextRequest) {
  const qs = req.nextUrl.searchParams.toString();
  const path = qs ? `/documents?${qs}` : '/documents';
  const documents = await serverApiFetch<IssuedDocument[]>(path);
  if (documents === null) return NextResponse.json({ message: 'No autenticado' }, { status: 401 });
  return NextResponse.json(documents);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const document = await serverApiFetch<IssuedDocument>('/documents', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  if (document === null) {
    return NextResponse.json({ message: 'No se pudo emitir el documento' }, { status: 400 });
  }
  return NextResponse.json(document, { status: 201 });
}
