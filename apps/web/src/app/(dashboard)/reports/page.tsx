import { ReportsTabs } from '@/features/reports/components/reports-tabs';
import { getCurrentUser } from '@/lib/server-api';
import { canViewReports, canManageGrading } from '@/lib/permissions';

export default async function ReportsPage() {
  const user = await getCurrentUser();
  const roles = user?.roles ?? [];

  return (
    <main className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Reportes</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Matrícula, asistencia, finanzas y boletines de notas.
        </p>
      </div>

      <ReportsTabs canViewInstitutional={canViewReports(roles)} canViewReportCards={canManageGrading(roles)} />
    </main>
  );
}
