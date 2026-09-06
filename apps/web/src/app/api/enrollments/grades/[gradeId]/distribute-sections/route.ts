import { NextRequest, NextResponse } from 'next/server';
import { serverApiFetch } from '@/lib/server-api';
import type { DistributeSectionsResultRow } from '@eduapp/shared-types';

export async function POST(req: NextRequest, { params }: { params: { gradeId: string } }) {
  const body = await req.json();
  const result = await serverApiFetch<DistributeSectionsResultRow[]>(
    `/enrollment/grades/${params.gradeId}/distribute-sections`,
    { method: 'POST', body: JSON.stringify(body) },
  );
  if (result === null) {
    const message = 'No se pudo repartir el grado';
    return NextResponse.json({ message }, { status: 400 });
  }
  return NextResponse.json(result);
}
