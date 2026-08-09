import Link from 'next/link';
import { SectionsList } from '@/features/academic/components/sections-list';
import { CreateSectionForm } from '@/features/academic/components/create-section-form';
import { getCurrentUser } from '@/lib/server-api';
import { canManageAcademic } from '@/lib/permissions';

export default async function SectionsPage() {
  const user = await getCurrentUser();
  const canManage = canManageAcademic(user?.roles ?? []);

  return (
    <main className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Secciones</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Gestión académica: secciones por grado.
        </p>
        <nav className="mt-2 flex gap-4 text-sm">
          <Link href="/academic/years" className="text-muted-foreground hover:underline">
            Años lectivos
          </Link>
          <Link href="/academic/grades" className="text-muted-foreground hover:underline">
            Grados
          </Link>
          <Link href="/academic/sections" className="text-primary underline">
            Secciones
          </Link>
        </nav>
      </div>

      {canManage && <CreateSectionForm />}
      <SectionsList />
    </main>
  );
}
