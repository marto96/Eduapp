import { AcademicYearsList } from '@/features/academic/components/academic-years-list';
import { CreateAcademicYearForm } from '@/features/academic/components/create-academic-year-form';
import { getCurrentUser } from '@/lib/server-api';
import { canManageAcademic } from '@/lib/permissions';

export default async function AcademicYearsPage() {
  const user = await getCurrentUser();
  const canManage = canManageAcademic(user?.roles ?? []);

  return (
    <main className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Años lectivos</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Gestión académica: años lectivos de la institución.
        </p>
      </div>

      {canManage && <CreateAcademicYearForm />}
      <AcademicYearsList />
    </main>
  );
}
