import { NextRequest, NextResponse } from 'next/server';
import { serverApiFetch } from '@/lib/server-api';
import type { GuardianLink } from '@eduapp/shared-types';

export async function GET(req: NextRequest) {
  const qs = req.nextUrl.searchParams.toString();
  const path = qs ? `/guardians?${qs}` : '/guardians';
  const links = await serverApiFetch<GuardianLink[]>(path);
  if (links === null) return NextResponse.json({ message: 'No autorizado' }, { status: 403 });
  return NextResponse.json(links);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const link = await serverApiFetch<GuardianLink>('/guardians', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  if (link === null) {
    return NextResponse.json({ message: 'No se pudo crear el vínculo' }, { status: 400 });
  }
  return NextResponse.json(link, { status: 201 });
}
