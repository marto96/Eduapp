import { NextResponse } from 'next/server';
import { platformApiFetch } from '@/lib/platform-api';

export interface SetupTotpResponse {
  secret: string;
  otpauthUri: string;
  qrCodeDataUrl: string;
  recoveryCodes: string[];
}

export async function POST() {
  const result = await platformApiFetch<SetupTotpResponse>('/platform/auth/2fa/setup', { method: 'POST' });
  if (result === null) {
    return NextResponse.json({ message: 'No se pudo iniciar la configuración de 2FA' }, { status: 400 });
  }
  return NextResponse.json(result);
}
