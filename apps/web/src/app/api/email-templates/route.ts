import { NextResponse } from 'next/server';
import { serverApiFetch } from '@/lib/server-api';
import type { EmailTemplateSummary } from '@eduapp/shared-types';

export async function GET() {
  const templates = await serverApiFetch<EmailTemplateSummary[]>('/email-templates');
  if (templates === null) {
    return NextResponse.json({ message: 'No autenticado' }, { status: 401 });
  }
  return NextResponse.json(templates);
}
