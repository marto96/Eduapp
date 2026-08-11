import { redirect } from 'next/navigation';
import { PortalView } from '@/features/portal/components/portal-view';
import { RequestGuardianLinkForm } from '@/features/portal/components/request-guardian-link-form';
import { getCurrentUser } from '@/lib/server-api';

export default async function PortalPage() {
  const user = await getCurrentUser();
  const roles = user?.roles ?? [];
  const isGuardian = roles.includes('padre_tutor');
  const isStudent = roles.includes('estudiante');

  if (!isGuardian && !isStudent) {
    redirect('/dashboard');
  }

  return (
    <main className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {isGuardian ? 'Mi familia' : 'Mis datos'}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {isGuardian
            ? 'Asistencia, notas, finanzas y documentos de tus hijos.'
            : 'Tu asistencia, notas, finanzas y documentos.'}
        </p>
      </div>

      {isGuardian && <RequestGuardianLinkForm />}
      <PortalView isGuardian={isGuardian} />
    </main>
  );
}
