import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
const TENANT_SUBDOMAIN = process.env.NEXT_PUBLIC_TENANT_SUBDOMAIN ?? '';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const res = await fetch(`${API_URL}/admissions/applications`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-tenant-subdomain': TENANT_SUBDOMAIN },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    return NextResponse.json({ message: data?.message ?? 'No se pudo enviar la solicitud' }, { status: res.status });
  }
  return NextResponse.json(data, { status: 201 });
}
