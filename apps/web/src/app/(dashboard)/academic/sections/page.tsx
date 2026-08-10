import { SectionsList } from '@/features/academic/components/sections-list';
import { CreateSectionForm } from '@/features/academic/components/create-section-form';
import { getCurrentUser } from '@/lib/server-api';
import { canManageAcademic } from '@/lib/permissions';

export default async function SectionsPage() {
  const user = await getCurrentUser();
  const canManage = canManageAcademic(user?.roles ?? []);

  return (
    <main className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Secciones</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Gestión académica: secciones por grado.
        </p>
      </div>

      {canManage && <CreateSectionForm />}
      <SectionsList />
    </main>
  );
}
