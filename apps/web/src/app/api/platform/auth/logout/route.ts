import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST() {
  cookies().delete('platform_access_token');
  return NextResponse.json({ ok: true });
}
