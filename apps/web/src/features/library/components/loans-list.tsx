'use client';

import { useLoans, useReturnLoan } from '../use-loans';
import { useBooks } from '../use-books';
import { useUsers } from '@/features/users/use-users';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export function LoansList({ canManage = false }: { canManage?: boolean }) {
  const { data: loans, isLoading, error } = useLoans();
  const { data: books } = useBooks();
  const { data: students } = useUsers('estudiante');
  const returnLoan = useReturnLoan();

  if (isLoading) return <p className="text-sm text-muted-foreground">Cargando...</p>;
  if (error) return <p className="text-sm text-destructive">No se pudieron cargar los préstamos.</p>;
  if (!loans || loans.length === 0) {
    return <p className="text-sm text-muted-foreground">Todavía no hay préstamos.</p>;
  }

  const bookTitleById = new Map(books?.map((b) => [b.id, b.title]));
  const studentNameById = new Map(students?.map((s) => [s.id, s.fullName]));

  return (
    <ul className="space-y-2">
      {loans.map((loan) => (
        <Card key={loan.id} className="flex items-center justify-between py-3">
          <div>
            <p className="font-medium">
              {bookTitleById.get(loan.bookId) ?? loan.bookId} —{' '}
              {studentNameById.get(loan.studentId) ?? loan.studentId}
            </p>
            <p className="text-sm text-muted-foreground">
              Vence {loan.dueDate}
              {loan.returnedAt ? ` — devuelto el ${loan.returnedAt.slice(0, 10)}` : ''}
            </p>
          </div>
          {canManage && !loan.returnedAt && (
            <Button
              variant="ghost"
              disabled={returnLoan.isPending}
              onClick={() => returnLoan.mutate(loan.id)}
            >
              Devolver
            </Button>
          )}
        </Card>
      ))}
    </ul>
  );
}
