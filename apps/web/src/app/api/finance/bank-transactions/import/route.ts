import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
const TENANT_SUBDOMAIN = process.env.NEXT_PUBLIC_TENANT_SUBDOMAIN ?? '';

export async function POST(req: NextRequest) {
  const accessToken = cookies().get('access_token')?.value;
  if (!accessToken) return NextResponse.json({ message: 'No autorizado' }, { status: 401 });

  const formData = await req.formData();
  const apiRes = await fetch(`${API_URL}/finance/bank-transactions/import`, {
    method: 'POST',
    headers: { authorization: `Bearer ${accessToken}`, 'x-tenant-subdomain': TENANT_SUBDOMAIN },
    body: formData,
  });

  if (!apiRes.ok) {
    const message = await apiRes.text();
    return NextResponse.json({ message }, { status: apiRes.status });
  }
  return NextResponse.json(await apiRes.json());
}
