import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
const TENANT_SUBDOMAIN = process.env.NEXT_PUBLIC_TENANT_SUBDOMAIN ?? '';

export async function GET(_req: NextRequest, { params }: { params: { trackingCode: string } }) {
  const res = await fetch(
    `${API_URL}/admissions/applications/status/${encodeURIComponent(params.trackingCode)}`,
    { headers: { 'x-tenant-subdomain': TENANT_SUBDOMAIN }, cache: 'no-store' },
  );
  if (!res.ok) {
    return NextResponse.json({ message: 'Solicitud no encontrada' }, { status: res.status });
  }
  return NextResponse.json(await res.json());
}
