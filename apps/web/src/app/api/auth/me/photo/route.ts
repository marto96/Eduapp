import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
const TENANT_SUBDOMAIN = process.env.NEXT_PUBLIC_TENANT_SUBDOMAIN ?? '';

/**
 * No puede reusar `serverApiFetch` (fuerza `content-type: application/
 * json`). Reenvía el `FormData` entrante tal cual, sin fijar `content-type`
 * — así `fetch` arma el boundary multipart correcto. Mismo criterio que
 * `apps/web/src/app/api/platform/tenants/[id]/logo/route.ts`.
 */
export async function POST(req: NextRequest) {
  const token = cookies().get('access_token')?.value;
  if (!token) return NextResponse.json({ message: 'No autenticado' }, { status: 401 });

  const formData = await req.formData();
  const apiRes = await fetch(`${API_URL}/auth/me/photo`, {
    method: 'POST',
    headers: { authorization: `Bearer ${token}`, 'x-tenant-subdomain': TENANT_SUBDOMAIN },
    body: formData,
  });

  if (!apiRes.ok) {
    return NextResponse.json({ message: 'No se pudo subir la foto' }, { status: apiRes.status });
  }
  return NextResponse.json(await apiRes.json());
}
