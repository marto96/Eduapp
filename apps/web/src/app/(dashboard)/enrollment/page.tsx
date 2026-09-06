import { EnrollmentsList } from '@/features/enrollment/components/enrollments-list';
import { EnrollStudentForm } from '@/features/enrollment/components/enroll-student-form';
import { DistributeSectionsButton } from '@/features/enrollment/components/distribute-sections-modal';
import { getCurrentUser } from '@/lib/server-api';
import { canManageEnrollment } from '@/lib/permissions';

export default async function EnrollmentPage({
  searchParams,
}: {
  searchParams: {
    admissionId?: string;
    matchedUserId?: string;
  };
}) {
  const user = await getCurrentUser();
  const canManage = canManageEnrollment(user?.roles ?? []);

  return (
    <main className="space-y-6 p-6">
      <div>
        <p className="mt-1 text-sm text-muted-foreground">
          Inscripción de estudiantes en secciones por año lectivo.
        </p>
      </div>

      {canManage && (
        <EnrollStudentForm
          admissionId={searchParams.admissionId}
          matchedUserId={searchParams.matchedUserId || undefined}
        />
      )}
      {canManage && <DistributeSectionsButton />}
      <EnrollmentsList canManage={canManage} />
    </main>
  );
}
