import { TakeAttendanceForm } from '@/features/attendance/components/take-attendance-form';
import { getCurrentUser } from '@/lib/server-api';
import { canRecordAttendance } from '@/lib/permissions';

export default async function AttendancePage() {
  const user = await getCurrentUser();
  const canRecord = canRecordAttendance(user?.roles ?? []);

  return (
    <main className="space-y-6 p-6">
      <div>
        <p className="mt-1 text-sm text-muted-foreground">
          Registro diario de presentes/ausentes por sección.
        </p>
      </div>

      <TakeAttendanceForm
        readOnly={!canRecord}
        currentUserId={user!.id}
        isDocente={(user?.roles ?? []).includes('docente')}
      />
    </main>
  );
}
