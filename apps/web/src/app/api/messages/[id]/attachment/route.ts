import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
const TENANT_SUBDOMAIN = process.env.NEXT_PUBLIC_TENANT_SUBDOMAIN ?? '';

/**
 * Multipart — no puede reusar `serverApiFetch` (fuerza `content-type:
 * application/json`). Reenvía el `FormData` entrante tal cual.
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const accessToken = cookies().get('access_token')?.value;
  if (!accessToken) return NextResponse.json({ message: 'No autorizado' }, { status: 401 });

  const formData = await req.formData();
  const apiRes = await fetch(`${API_URL}/messages/${params.id}/attachment`, {
    method: 'POST',
    headers: { authorization: `Bearer ${accessToken}`, 'x-tenant-subdomain': TENANT_SUBDOMAIN },
    body: formData,
  });

  if (!apiRes.ok) {
    return NextResponse.json({ message: 'No se pudo subir el adjunto' }, { status: apiRes.status });
  }
  return NextResponse.json(await apiRes.json());
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const accessToken = cookies().get('access_token')?.value;
  if (!accessToken) return NextResponse.json({ message: 'No autorizado' }, { status: 401 });

  const apiRes = await fetch(`${API_URL}/messages/${params.id}/attachment`, {
    headers: { authorization: `Bearer ${accessToken}`, 'x-tenant-subdomain': TENANT_SUBDOMAIN },
  });

  if (!apiRes.ok) {
    return NextResponse.json({ message: 'No se pudo descargar el adjunto' }, { status: apiRes.status });
  }

  return new Response(apiRes.body, {
    headers: {
      'Content-Type': apiRes.headers.get('content-type') ?? 'application/octet-stream',
      'Content-Disposition': apiRes.headers.get('content-disposition') ?? 'attachment',
    },
  });
}
