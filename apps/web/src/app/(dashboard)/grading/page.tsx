import { CreateEvaluationForm } from '@/features/grading/components/create-evaluation-form';
import { EvaluationsList } from '@/features/grading/components/evaluations-list';
import { RecordScoresForm } from '@/features/grading/components/record-scores-form';
import { getCurrentUser } from '@/lib/server-api';
import { canManageGrading } from '@/lib/permissions';

export default async function GradingPage() {
  const user = await getCurrentUser();
  const canManage = canManageGrading(user?.roles ?? []);

  return (
    <main className="space-y-8 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Calificaciones</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Evaluaciones y notas por sección y asignatura.
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Evaluaciones</h2>
        {canManage && <CreateEvaluationForm />}
        <EvaluationsList />
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Cargar notas</h2>
        <RecordScoresForm readOnly={!canManage} />
      </section>
    </main>
  );
}
