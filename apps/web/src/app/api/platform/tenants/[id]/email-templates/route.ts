import { NextResponse } from 'next/server';
import { platformApiFetch } from '@/lib/platform-api';
import type { EmailTemplateSummary } from '@eduapp/shared-types';

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const templates = await platformApiFetch<EmailTemplateSummary[]>(
    `/platform/tenants/${params.id}/email-templates`,
  );
  if (templates === null) {
    return NextResponse.json({ message: 'No se pudieron cargar las plantillas de correo' }, { status: 401 });
  }
  return NextResponse.json(templates);
}
