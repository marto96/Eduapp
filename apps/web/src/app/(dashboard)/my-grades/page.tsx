import { redirect } from 'next/navigation';
import { MyGradesView } from '@/features/grading/components/my-grades-view';
import { getCurrentUser } from '@/lib/server-api';

export default async function MyGradesPage() {
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
        <h1 className="text-2xl font-semibold tracking-tight">Calificaciones</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {isGuardian ? 'Las notas de tus hijos, por materia y periodo.' : 'Tus notas, por materia y periodo.'}
        </p>
      </div>

      <MyGradesView isGuardian={isGuardian} />
    </main>
  );
}
