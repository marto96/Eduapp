import { NextRequest, NextResponse } from 'next/server';
import { platformApiFetchWithStatus } from '@/lib/platform-api';

/**
 * Usa `platformApiFetchWithStatus` (no `platformApiFetch`): el envío de
 * prueba propaga el error real de Resend (API key inválida, etc.) en vez
 * de colapsarlo a un mensaje genérico — mismo criterio que la ruta BFF
 * equivalente del lado tenant.
 */
export async function POST(req: NextRequest, { params }: { params: { id: string; type: string } }) {
  const body = await req.json();
  const { status, body: data } = await platformApiFetchWithStatus(
    `/platform/tenants/${params.id}/email-templates/${params.type}/test`,
    { method: 'POST', body: JSON.stringify(body) },
  );
  if (status >= 400) {
    const message = data && typeof data === 'object' && 'message' in data ? data.message : undefined;
    return NextResponse.json({ message: message ?? 'No se pudo enviar el correo de prueba' }, { status });
  }
  return NextResponse.json(data ?? { ok: true });
}
