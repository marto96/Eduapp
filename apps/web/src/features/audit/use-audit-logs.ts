'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import type { AuditLog, AuditLogKind, PaginatedResult } from '@eduapp/shared-types';

export interface AuditLogsFilter {
  search?: string;
  kind?: AuditLogKind;
  from?: string;
  to?: string;
  page: number;
  pageSize: number;
}

async function fetchAuditLogs(filter: AuditLogsFilter): Promise<PaginatedResult<AuditLog>> {
  const params = new URLSearchParams();
  if (filter.search) params.set('search', filter.search);
  if (filter.kind) params.set('kind', filter.kind);
  if (filter.from) params.set('from', filter.from);
  if (filter.to) params.set('to', filter.to);
  params.set('page', String(filter.page));
  params.set('pageSize', String(filter.pageSize));

  const res = await fetch(`/api/audit-logs?${params.toString()}`);
  if (!res.ok) throw new Error('No se pudieron cargar los logs de auditoría');
  return res.json();
}

export function useAuditLogs(filter: AuditLogsFilter) {
  return useQuery({
    queryKey: ['audit-logs', filter],
    queryFn: () => fetchAuditLogs(filter),
    // Mismo motivo que en Usuarios/Matrícula: cada página/búsqueda distinta
    // es una query-key nueva, así que sin esto el buscador pierde foco en
    // cada tecla.
    placeholderData: keepPreviousData,
  });
}
