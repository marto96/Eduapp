import { GradesList } from '@/features/academic/components/grades-list';
import { CreateGradeForm } from '@/features/academic/components/create-grade-form';
import { getCurrentUser } from '@/lib/server-api';
import { canManageAcademic } from '@/lib/permissions';

export default async function GradesPage() {
  const user = await getCurrentUser();
  const canManage = canManageAcademic(user?.roles ?? []);

  return (
    <main className="space-y-6 p-6">
      <div>
        <p className="mt-1 text-sm text-muted-foreground">
          Gestión académica: grados de la institución.
        </p>
      </div>

      {canManage && <CreateGradeForm />}
      <GradesList canManage={canManage} />
    </main>
  );
}
