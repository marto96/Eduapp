import { NextRequest, NextResponse } from 'next/server';
import { serverApiFetch } from '@/lib/server-api';
import type { Leave } from '@eduapp/shared-types';

export async function GET(req: NextRequest) {
  const qs = req.nextUrl.searchParams.toString();
  const path = qs ? `/hr/leaves?${qs}` : '/hr/leaves';
  const leaves = await serverApiFetch<Leave[]>(path);
  if (leaves === null) return NextResponse.json({ message: 'No autorizado' }, { status: 403 });
  return NextResponse.json(leaves);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const leave = await serverApiFetch<Leave>('/hr/leaves', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  if (leave === null) {
    return NextResponse.json({ message: 'No se pudo cargar la licencia' }, { status: 400 });
  }
  return NextResponse.json(leave, { status: 201 });
}
