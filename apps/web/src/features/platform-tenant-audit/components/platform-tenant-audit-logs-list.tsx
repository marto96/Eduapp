'use client';

import { useEffect, useState } from 'react';
import { Download } from 'lucide-react';
import { usePlatformTenantAuditLogs, buildExportUrl } from '../use-platform-tenant-audit-logs';
import { describeAction } from '@/features/audit/components/audit-logs-list';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { LoadingState } from '@/components/ui/loading-state';
import { Pagination } from '@/components/ui/pagination';

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];
const SEARCH_DEBOUNCE_MS = 350;

export function PlatformTenantAuditLogsList({ tenantId }: { tenantId: string }) {
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

  const { data, isLoading, error } = usePlatformTenantAuditLogs({
    tenantId,
    page,
    pageSize,
    search: committedSearch || undefined,
  });
  const logs = data?.items;

  const header = (
    <div className="flex items-center justify-between gap-3">
      <Input
        placeholder="Buscar por email del actor o ruta..."
        value={searchInput}
        onChange={(e) => setSearchInput(e.target.value)}
        className="w-72"
      />
      <a href={buildExportUrl(tenantId, committedSearch || undefined)} download>
        <Button type="button" variant="secondary">
          <Download className="mr-1.5 h-4 w-4" />
          Exportar CSV
        </Button>
      </a>
    </div>
  );

  if (isLoading) return <LoadingState />;
  if (error) {
    return (
      <div className="space-y-3">
        {header}
        <p className="text-sm text-destructive">No se pudieron cargar los logs.</p>
      </div>
    );
  }
  if (!logs || logs.length === 0) {
    return (
      <div className="space-y-3">
        {header}
        <p className="text-sm text-muted-foreground">
          {committedSearch ? 'No hay logs que coincidan con la búsqueda.' : 'Todavía no hay logs.'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {header}
      <ul className="max-h-[65vh] space-y-2 overflow-y-auto pr-1">
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
                {log.impersonatedBy && (
                  <span className="rounded bg-amber-500/10 px-1.5 py-0.5 text-xs font-medium text-amber-600">
                    Vía impersonación
                  </span>
                )}
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
