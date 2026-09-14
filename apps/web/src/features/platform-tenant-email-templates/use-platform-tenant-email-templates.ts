'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { EmailTemplateSummary, EmailTemplateType } from '@eduapp/shared-types';

async function fetchPlatformTenantEmailTemplates(tenantId: string): Promise<EmailTemplateSummary[]> {
  const res = await fetch(`/api/platform/tenants/${tenantId}/email-templates`);
  if (!res.ok) throw new Error('No se pudieron cargar las plantillas de correo');
  return res.json();
}

export function usePlatformTenantEmailTemplates(tenantId: string) {
  return useQuery({
    queryKey: ['platform-tenant-email-templates', tenantId],
    queryFn: () => fetchPlatformTenantEmailTemplates(tenantId),
  });
}

export interface PlatformUpdateTenantEmailTemplateInput {
  type: EmailTemplateType;
  subject: string;
  body: string;
}

async function updatePlatformTenantEmailTemplate(
  tenantId: string,
  input: PlatformUpdateTenantEmailTemplateInput,
): Promise<void> {
  const res = await fetch(`/api/platform/tenants/${tenantId}/email-templates/${input.type}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ subject: input.subject, body: input.body }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.message ?? 'No se pudo actualizar la plantilla');
  }
}

export function usePlatformUpdateTenantEmailTemplate(tenantId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: PlatformUpdateTenantEmailTemplateInput) =>
      updatePlatformTenantEmailTemplate(tenantId, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['platform-tenant-email-templates', tenantId] }),
  });
}

export interface PlatformSendTenantTestEmailInput {
  type: EmailTemplateType;
  to: string;
}

async function sendPlatformTenantTestEmail(
  tenantId: string,
  input: PlatformSendTenantTestEmailInput,
): Promise<void> {
  const res = await fetch(`/api/platform/tenants/${tenantId}/email-templates/${input.type}/test`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ to: input.to }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.message ?? 'No se pudo enviar el correo de prueba');
  }
}

export function usePlatformSendTenantTestEmail(tenantId: string) {
  return useMutation({
    mutationFn: (input: PlatformSendTenantTestEmailInput) => sendPlatformTenantTestEmail(tenantId, input),
  });
}
