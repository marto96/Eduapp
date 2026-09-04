import { GradingTabs } from '@/features/grading/components/grading-tabs';
import { getCurrentUser } from '@/lib/server-api';
import { canManageGrading } from '@/lib/permissions';

export default async function GradingPage() {
  const user = await getCurrentUser();
  const canManage = canManageGrading(user?.roles ?? []);

  return (
    <main className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Calificaciones</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Evaluaciones y notas por sección y asignatura.
        </p>
      </div>

      <GradingTabs canManage={canManage} />
    </main>
  );
}
