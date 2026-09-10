import { PlatformTenantAuditLogsList } from '@/features/platform-tenant-audit/components/platform-tenant-audit-logs-list';

export default function PlatformTenantAuditPage({ params }: { params: { id: string } }) {
  return (
    <main className="space-y-4 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Auditoría</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Registro de acciones de esta institución — solo lectura.
        </p>
      </div>
      <PlatformTenantAuditLogsList tenantId={params.id} />
    </main>
  );
}
