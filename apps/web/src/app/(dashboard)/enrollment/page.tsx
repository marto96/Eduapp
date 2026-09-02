import { EnrollmentsList } from '@/features/enrollment/components/enrollments-list';
import { EnrollStudentForm } from '@/features/enrollment/components/enroll-student-form';
import { getCurrentUser } from '@/lib/server-api';
import { canManageEnrollment } from '@/lib/permissions';
import type { IdentityDocumentType } from '@eduapp/shared-types';

export default async function EnrollmentPage({
  searchParams,
}: {
  searchParams: {
    admissionId?: string;
    matchedUserId?: string;
    firstName?: string;
    lastName?: string;
    birthDate?: string;
    documentType?: string;
    documentNumber?: string;
    address?: string;
    gradeId?: string;
    academicYearId?: string;
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
          prefill={
            searchParams.admissionId
              ? {
                  firstName: searchParams.firstName ?? '',
                  lastName: searchParams.lastName ?? '',
                  birthDate: searchParams.birthDate ?? '',
                  documentType: (searchParams.documentType as IdentityDocumentType) || '',
                  documentNumber: searchParams.documentNumber ?? '',
                  address: searchParams.address ?? '',
                  academicYearId: searchParams.academicYearId ?? '',
                }
              : undefined
          }
        />
      )}
      <EnrollmentsList canManage={canManage} />
    </main>
  );
}
