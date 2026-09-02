import { AdmissionApplicationsList } from '@/features/admissions/components/admission-applications-list';
import { getCurrentUser } from '@/lib/server-api';
import { canManageAdmissions } from '@/lib/permissions';
import { redirect } from 'next/navigation';

export default async function AdmissionsPage() {
  const user = await getCurrentUser();
  if (!canManageAdmissions(user?.roles ?? [])) redirect('/dashboard');

  return (
    <main className="space-y-6 p-6">
      <div>
        <p className="mt-1 text-sm text-muted-foreground">
          Solicitudes de admisión: pago, entrevista, y aceptación/rechazo.
        </p>
      </div>
      <AdmissionApplicationsList />
    </main>
  );
}
