import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

/**
 * No puede reusar `platformApiFetch` (fuerza `content-type: application/
 * json`). Reenvía el `FormData` entrante tal cual, sin fijar `content-type`
 * — así `fetch` arma el boundary multipart correcto.
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const token = cookies().get('platform_access_token')?.value;
  if (!token) return NextResponse.json({ message: 'No autorizado' }, { status: 403 });

  const formData = await req.formData();
  const apiRes = await fetch(`${API_URL}/platform/tenants/${params.id}/logo`, {
    method: 'POST',
    headers: { authorization: `Bearer ${token}` },
    body: formData,
  });

  if (!apiRes.ok) {
    return NextResponse.json({ message: 'No se pudo subir el logo' }, { status: apiRes.status });
  }
  return NextResponse.json(await apiRes.json());
}
