import Link from 'next/link';
import { GradesList } from '@/features/academic/components/grades-list';
import { CreateGradeForm } from '@/features/academic/components/create-grade-form';
import { getCurrentUser } from '@/lib/server-api';
import { canManageAcademic } from '@/lib/permissions';

export default async function GradesPage() {
  const user = await getCurrentUser();
  const canManage = canManageAcademic(user?.roles ?? []);

  return (
    <main className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Grados</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Gestión académica: grados de la institución.
        </p>
        <nav className="mt-2 flex gap-4 text-sm">
          <Link href="/academic/years" className="text-muted-foreground hover:underline">
            Años lectivos
          </Link>
          <Link href="/academic/grades" className="text-primary underline">
            Grados
          </Link>
          <Link href="/academic/sections" className="text-muted-foreground hover:underline">
            Secciones
          </Link>
        </nav>
      </div>

      {canManage && <CreateGradeForm />}
      <GradesList />
    </main>
  );
}
