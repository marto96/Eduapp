'use client';

import { useEffect, useState } from 'react';
import { useAuditLogs } from '../use-audit-logs';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { LoadingState } from '@/components/ui/loading-state';
import { Pagination } from '@/components/ui/pagination';
import type { AuditLog } from '@eduapp/shared-types';

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];
const SEARCH_DEBOUNCE_MS = 350;

/**
 * Traduce método+ruta a una descripción legible — se amplía con el tiempo
 * sin tocar el interceptor del backend. Cualquier ruta sin match acá cae al
 * fallback genérico (`method` + `route`), nunca queda en blanco.
 */
const ROUTE_LABELS: { pattern: RegExp; label: (m: RegExpMatchArray) => string }[] = [
  { pattern: /^DELETE \/academic\/sections\//, label: () => 'Eliminó una sección' },
  { pattern: /^PATCH \/academic\/sections\//, label: () => 'Editó una sección' },
  { pattern: /^DELETE \/academic\/grades\//, label: () => 'Eliminó un grado' },
  { pattern: /^PATCH \/academic\/grades\//, label: () => 'Editó un grado' },
  { pattern: /^DELETE \/academic\/years\//, label: () => 'Eliminó un año lectivo' },
  { pattern: /^PATCH \/academic\/years\//, label: () => 'Editó un año lectivo' },
  { pattern: /^PATCH \/users\/[^/]+\/deactivate/, label: () => 'Inactivó un usuario' },
  { pattern: /^PATCH \/users\/[^/]+\/reactivate/, label: () => 'Reactivó un usuario' },
  { pattern: /^PATCH \/users\//, label: () => 'Editó un usuario' },
  { pattern: /^PATCH \/enrollments\/[^/]+\/withdraw/, label: () => 'Dio de baja una matrícula' },
  { pattern: /^PATCH \/enrollments\/[^/]+\/reassign-section/, label: () => 'Reubicó una matrícula' },
  { pattern: /^POST \/enrollments/, label: () => 'Matriculó un estudiante' },
  { pattern: /^GET \/users/, label: () => 'Consultó el listado de usuarios' },
  { pattern: /^GET \/finance\/charges/, label: () => 'Consultó cargos de un estudiante' },
];

function describeAction(log: AuditLog): string {
  const key = `${log.method} ${log.route}`;
  for (const entry of ROUTE_LABELS) {
    const match = key.match(entry.pattern);
    if (match) return entry.label(match);
  }
  return key;
}

export function AuditLogsList() {
  const [searchInput, setSearchInput] = useState('');
  const [committedSearch, setCommittedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  useEffect(() => {
    const timeout = setTimeout(() => setCommittedSearch(searchInput), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timeout);
  }, [searchInput]);

  useEffect(() => {
    setPage(1);
  }, [committedSearch, pageSize]);

  const { data, isLoading, error } = useAuditLogs({
    page,
    pageSize,
    search: committedSearch || undefined,
  });
  const logs = data?.items;

  const filters = (
    <Input
      placeholder="Buscar por email del actor o ruta..."
      value={searchInput}
      onChange={(e) => setSearchInput(e.target.value)}
      className="w-72"
    />
  );

  if (isLoading) return <LoadingState />;
  if (error) {
    return (
      <div className="space-y-3">
        {filters}
        <p className="text-sm text-destructive">No se pudieron cargar los logs.</p>
      </div>
    );
  }
  if (!logs || logs.length === 0) {
    return (
      <div className="space-y-3">
        {filters}
        <p className="text-sm text-muted-foreground">
          {committedSearch ? 'No hay logs que coincidan con la búsqueda.' : 'Todavía no hay logs.'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {filters}
      <ul className="space-y-2">
        {logs.map((log) => (
          <Card key={log.id} className="py-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{describeAction(log)}</p>
                <p className="text-sm text-muted-foreground">
                  {log.actorEmail ?? 'Anónimo'}
                  {log.actorRoles?.length ? ` (${log.actorRoles.join(', ')})` : ''}
                </p>
              </div>
              <div className="flex items-center gap-3 text-right">
                <span
                  className={`rounded px-1.5 py-0.5 text-xs font-medium ${
                    log.success ? 'bg-primary/10 text-primary' : 'bg-destructive/10 text-destructive'
                  }`}
                >
                  {log.success ? 'Éxito' : 'Error'}
                </span>
                <span className="text-xs text-muted-foreground">
                  {new Date(log.createdAt).toLocaleString('es-CO')}
                </span>
              </div>
            </div>
          </Card>
        ))}
      </ul>
      {data && (
        <Pagination
          page={data.page}
          pageSize={data.pageSize}
          total={data.total}
          onPageChange={setPage}
          pageSizeOptions={PAGE_SIZE_OPTIONS}
          onPageSizeChange={setPageSize}
        />
      )}
    </div>
  );
}
