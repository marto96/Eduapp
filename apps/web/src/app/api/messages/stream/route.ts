import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
const TENANT_SUBDOMAIN = process.env.NEXT_PUBLIC_TENANT_SUBDOMAIN ?? '';

/**
 * El navegador no puede mandar el header `Authorization` con `EventSource`
 * nativo — este proxy lee el access token de la cookie httpOnly server-side
 * (igual que `serverApiFetch`) y streamea la respuesta SSE del backend tal
 * cual, sin buffer-ear nada.
 */
export async function GET() {
  const accessToken = cookies().get('access_token')?.value;
  if (!accessToken) return NextResponse.json({ message: 'No autorizado' }, { status: 401 });

  const apiRes = await fetch(`${API_URL}/messages/stream`, {
    headers: {
      authorization: `Bearer ${accessToken}`,
      'x-tenant-subdomain': TENANT_SUBDOMAIN,
    },
  });

  return new Response(apiRes.body, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}
