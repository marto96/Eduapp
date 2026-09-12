import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
const TENANT_SUBDOMAIN = process.env.NEXT_PUBLIC_TENANT_SUBDOMAIN ?? '';

export async function GET(_req: NextRequest, { params }: { params: { trackingCode: string } }) {
  const res = await fetch(
    `${API_URL}/admissions/applications/status/${encodeURIComponent(params.trackingCode)}/documents`,
    { headers: { 'x-tenant-subdomain': TENANT_SUBDOMAIN }, cache: 'no-store' },
  );
  if (!res.ok) {
    return NextResponse.json({ message: 'Solicitud no encontrada' }, { status: res.status });
  }
  return NextResponse.json(await res.json());
}

// Reenvía el multipart tal cual — `fetch` genera el boundary solo cuando el
// body es un `FormData`, así que basta con leer el del request entrante y
// pasarlo directo, sin tocar el archivo.
export async function POST(req: NextRequest, { params }: { params: { trackingCode: string } }) {
  const formData = await req.formData();
  const res = await fetch(
    `${API_URL}/admissions/applications/status/${encodeURIComponent(params.trackingCode)}/documents`,
    { method: 'POST', headers: { 'x-tenant-subdomain': TENANT_SUBDOMAIN }, body: formData },
  );
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    return NextResponse.json(body ?? { message: 'No se pudo subir el documento' }, { status: res.status });
  }
  return NextResponse.json(body);
}
