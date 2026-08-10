import { CreateScheduleForm } from '@/features/schedule/components/create-schedule-form';
import { SchedulesList } from '@/features/schedule/components/schedules-list';
import { getCurrentUser } from '@/lib/server-api';
import { canManageAcademic } from '@/lib/permissions';

export default async function SchedulePage() {
  const user = await getCurrentUser();
  const canManage = canManageAcademic(user?.roles ?? []);

  return (
    <main className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Horarios</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Asignación de docentes a secciones y asignaturas por bloque horario.
        </p>
      </div>

      {canManage && <CreateScheduleForm />}
      <SchedulesList />
    </main>
  );
}
