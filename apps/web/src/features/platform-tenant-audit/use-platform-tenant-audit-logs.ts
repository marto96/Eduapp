'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import type { AuditLog, PaginatedResult } from '@eduapp/shared-types';

export interface PlatformTenantAuditLogsFilter {
  tenantId: string;
  search?: string;
  page: number;
  pageSize: number;
}

async function fetchPlatformTenantAuditLogs(
  filter: PlatformTenantAuditLogsFilter,
): Promise<PaginatedResult<AuditLog>> {
  const params = new URLSearchParams();
  if (filter.search) params.set('search', filter.search);
  params.set('page', String(filter.page));
  params.set('pageSize', String(filter.pageSize));

  const res = await fetch(`/api/platform/tenants/${filter.tenantId}/audit-logs?${params.toString()}`);
  if (!res.ok) throw new Error('No se pudieron cargar los logs de auditoría');
  return res.json();
}

export function usePlatformTenantAuditLogs(filter: PlatformTenantAuditLogsFilter) {
  return useQuery({
    queryKey: ['platform-tenant-audit-logs', filter],
    queryFn: () => fetchPlatformTenantAuditLogs(filter),
    placeholderData: keepPreviousData,
  });
}

/** URL para el link "Exportar CSV" — el navegador la descarga directo por el header `Content-Disposition`. */
export function buildExportUrl(tenantId: string, search?: string): string {
  const params = new URLSearchParams();
  if (search) params.set('search', search);
  const qs = params.toString();
  return `/api/platform/tenants/${tenantId}/audit-logs/export${qs ? `?${qs}` : ''}`;
}
