import { TakeAttendanceForm } from '@/features/attendance/components/take-attendance-form';
import { getCurrentUser } from '@/lib/server-api';
import { canRecordAttendance } from '@/lib/permissions';

export default async function AttendancePage() {
  const user = await getCurrentUser();
  const canRecord = canRecordAttendance(user?.roles ?? []);

  return (
    <main className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Asistencia</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Registro diario de presentes/ausentes por sección.
        </p>
      </div>

      <TakeAttendanceForm readOnly={!canRecord} />
    </main>
  );
}
