import { redirect } from 'next/navigation';
import { AuditLogsList } from '@/features/audit/components/audit-logs-list';
import { getCurrentUser } from '@/lib/server-api';
import { canViewAuditLogs } from '@/lib/permissions';

export default async function AuditPage() {
  const user = await getCurrentUser();
  if (!canViewAuditLogs(user?.roles ?? [])) {
    redirect('/dashboard');
  }

  return (
    <main className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Auditoría</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Registro de acciones ejecutadas por usuarios de la institución.
        </p>
      </div>
      <AuditLogsList />
    </main>
  );
}
