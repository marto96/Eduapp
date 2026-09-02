import { NextResponse } from 'next/server';
import type { Grade } from '@eduapp/shared-types';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
const TENANT_SUBDOMAIN = process.env.NEXT_PUBLIC_TENANT_SUBDOMAIN ?? '';

export async function GET() {
  const res = await fetch(`${API_URL}/academic/grades`, {
    headers: { 'x-tenant-subdomain': TENANT_SUBDOMAIN },
    cache: 'no-store',
  });
  if (!res.ok) return NextResponse.json([], { status: 200 });
  return NextResponse.json((await res.json()) as Grade[]);
}
