import { CreateBookForm } from '@/features/library/components/create-book-form';
import { BooksList } from '@/features/library/components/books-list';
import { CreateLoanForm } from '@/features/library/components/create-loan-form';
import { LoansList } from '@/features/library/components/loans-list';
import { getCurrentUser } from '@/lib/server-api';
import { canManageLibrary } from '@/lib/permissions';

export default async function LibraryPage() {
  const user = await getCurrentUser();
  const canManage = canManageLibrary(user?.roles ?? []);

  return (
    <main className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Biblioteca</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Catálogo de libros y préstamos a estudiantes.
        </p>
      </div>

      <div className="space-y-3">
        <h2 className="text-lg font-medium">Catálogo</h2>
        {canManage && <CreateBookForm />}
        <BooksList canManage={canManage} />
      </div>

      <div className="space-y-3">
        <h2 className="text-lg font-medium">Préstamos</h2>
        {canManage && <CreateLoanForm />}
        <LoansList canManage={canManage} />
      </div>
    </main>
  );
}
