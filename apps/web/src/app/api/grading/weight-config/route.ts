import { NextRequest, NextResponse } from 'next/server';
import { serverApiFetch } from '@/lib/server-api';
import type { GradeWeightConfig } from '@eduapp/shared-types';

export async function GET() {
  const config = await serverApiFetch<GradeWeightConfig>('/grading/weight-config');
  if (config === null) {
    return NextResponse.json({ message: 'No autenticado' }, { status: 401 });
  }
  return NextResponse.json(config);
}

export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const config = await serverApiFetch<GradeWeightConfig>('/grading/weight-config', {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
  if (config === null) {
    return NextResponse.json({ message: 'No se pudo actualizar la configuración' }, { status: 400 });
  }
  return NextResponse.json(config);
}
