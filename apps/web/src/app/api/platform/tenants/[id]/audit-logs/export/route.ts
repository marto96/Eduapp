import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

/**
 * No usa `platformApiFetch`/`platformApiFetchWithStatus` — ambos asumen
 * una respuesta JSON. Esta ruta reenvía el CSV (`text/csv`) tal cual,
 * incluyendo el header que dispara la descarga en el navegador.
 */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const token = cookies().get('platform_access_token')?.value;
  if (!token) {
    return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
  }

  const qs = req.nextUrl.searchParams.toString();
  const apiRes = await fetch(
    `${API_URL}/platform/tenants/${params.id}/audit-logs/export${qs ? `?${qs}` : ''}`,
    { headers: { authorization: `Bearer ${token}` }, cache: 'no-store' },
  );

  if (!apiRes.ok) {
    return NextResponse.json({ message: 'No se pudo exportar la auditoría' }, { status: apiRes.status });
  }

  const csv = await apiRes.text();
  return new NextResponse(csv, {
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': 'attachment; filename="auditoria.csv"',
    },
  });
}
