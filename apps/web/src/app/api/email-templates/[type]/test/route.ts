import { NextRequest, NextResponse } from 'next/server';

/**
 * No usa `serverApiFetch`: ese helper devuelve `null` en cualquier
 * respuesta no-ok, descartando el mensaje real del backend. Acá ese
 * mensaje es justamente el punto — `SendTestEmailUseCase` propaga el
 * error real de Resend (API key inválida, etc.) para que quien prueba
 * sepa qué falló, así que se reenvía tal cual en vez de perderlo.
 */
export async function POST(req: NextRequest, { params }: { params: { type: string } }) {
  const accessToken = req.cookies.get('access_token')?.value;
  if (!accessToken) {
    return NextResponse.json({ message: 'No autenticado' }, { status: 401 });
  }

  const body = await req.json();
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
  const res = await fetch(`${apiUrl}/email-templates/${params.type}/test`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${accessToken}`,
      'x-tenant-subdomain': process.env.NEXT_PUBLIC_TENANT_SUBDOMAIN ?? '',
    },
    body: JSON.stringify(body),
  });

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    return NextResponse.json({ message: data?.message ?? 'No se pudo enviar el correo de prueba' }, { status: res.status });
  }
  return NextResponse.json(data ?? { ok: true });
}
