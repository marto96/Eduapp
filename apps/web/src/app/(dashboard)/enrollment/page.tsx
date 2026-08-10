import { EnrollmentsList } from '@/features/enrollment/components/enrollments-list';
import { EnrollStudentForm } from '@/features/enrollment/components/enroll-student-form';
import { getCurrentUser } from '@/lib/server-api';
import { canManageEnrollment } from '@/lib/permissions';

export default async function EnrollmentPage() {
  const user = await getCurrentUser();
  const canManage = canManageEnrollment(user?.roles ?? []);

  return (
    <main className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Matrícula</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Inscripción de estudiantes en secciones por año lectivo.
        </p>
      </div>

      {canManage && <EnrollStudentForm />}
      <EnrollmentsList />
    </main>
  );
}
