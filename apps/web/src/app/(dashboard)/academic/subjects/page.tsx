import { SubjectsList } from '@/features/academic/components/subjects-list';
import { CreateSubjectForm } from '@/features/academic/components/create-subject-form';
import { getCurrentUser } from '@/lib/server-api';
import { canManageAcademic } from '@/lib/permissions';

export default async function SubjectsPage() {
  const user = await getCurrentUser();
  const canManage = canManageAcademic(user?.roles ?? []);

  return (
    <main className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Asignaturas</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Materias que se dictan en la institución.
        </p>
      </div>

      {canManage && <CreateSubjectForm />}
      <SubjectsList />
    </main>
  );
}
