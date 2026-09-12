import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
const TENANT_SUBDOMAIN = process.env.NEXT_PUBLIC_TENANT_SUBDOMAIN ?? '';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const res = await fetch(`${API_URL}/documents/verify/${encodeURIComponent(params.id)}`, {
    headers: { 'x-tenant-subdomain': TENANT_SUBDOMAIN },
    cache: 'no-store',
  });
  if (!res.ok) {
    return NextResponse.json({ message: 'Documento no encontrado' }, { status: res.status });
  }
  return NextResponse.json(await res.json());
}
