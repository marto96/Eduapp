'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { EmailTemplateSummary, EmailTemplateType } from '@eduapp/shared-types';

async function fetchEmailTemplates(): Promise<EmailTemplateSummary[]> {
  const res = await fetch('/api/email-templates');
  if (!res.ok) throw new Error('No se pudieron cargar las plantillas de correo');
  return res.json();
}

export interface UpdateEmailTemplateInput {
  type: EmailTemplateType;
  subject: string;
  body: string;
}

async function updateEmailTemplate(input: UpdateEmailTemplateInput): Promise<void> {
  const res = await fetch(`/api/email-templates/${input.type}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ subject: input.subject, body: input.body }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.message ?? 'No se pudo actualizar la plantilla');
  }
}

export function useEmailTemplates() {
  return useQuery({ queryKey: ['email-templates'], queryFn: fetchEmailTemplates, staleTime: 5 * 60 * 1000 });
}

export function useUpdateEmailTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateEmailTemplate,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['email-templates'] }),
  });
}

export interface SendTestEmailInput {
  type: EmailTemplateType;
  to: string;
}

async function sendTestEmail(input: SendTestEmailInput): Promise<void> {
  const res = await fetch(`/api/email-templates/${input.type}/test`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ to: input.to }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.message ?? 'No se pudo enviar el correo de prueba');
  }
}

export function useSendTestEmail() {
  return useMutation({ mutationFn: sendTestEmail });
}
