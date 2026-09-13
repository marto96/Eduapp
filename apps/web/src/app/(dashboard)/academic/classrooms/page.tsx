import { ClassroomsList } from '@/features/academic/components/classrooms-list';
import { CreateClassroomForm } from '@/features/academic/components/create-classroom-form';
import { getCurrentUser } from '@/lib/server-api';
import { canManageAcademic } from '@/lib/permissions';

export default async function ClassroomsPage() {
  const user = await getCurrentUser();
  const canManage = canManageAcademic(user?.roles ?? []);

  return (
    <main className="space-y-6 p-6">
      <div>
        <p className="mt-1 text-sm text-muted-foreground">
          Aulas físicas de la institución, usadas para detectar cruces de horario.
        </p>
      </div>

      {canManage && <CreateClassroomForm />}
      <ClassroomsList />
    </main>
  );
}
