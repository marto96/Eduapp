import { NextRequest, NextResponse } from 'next/server';
import { serverApiFetch } from '@/lib/server-api';
import type { DocumentRequest } from '@eduapp/shared-types';

export async function GET(req: NextRequest) {
  const qs = req.nextUrl.searchParams.toString();
  const requests = await serverApiFetch<DocumentRequest[]>(qs ? `/documents/requests?${qs}` : '/documents/requests');
  if (requests === null) return NextResponse.json({ message: 'No autenticado' }, { status: 401 });
  return NextResponse.json(requests);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const request = await serverApiFetch<DocumentRequest>('/documents/requests', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  if (request === null) {
    return NextResponse.json({ message: 'No se pudo crear la solicitud' }, { status: 400 });
  }
  return NextResponse.json(request, { status: 201 });
}
