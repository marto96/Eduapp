'use client';

import { useBooks } from '../use-books';
import { useLoans } from '../use-loans';
import { Card } from '@/components/ui/card';

export function BooksList({ canManage = false }: { canManage?: boolean }) {
  const { data: books, isLoading, error } = useBooks();
  const { data: loans } = useLoans();

  if (isLoading) return <p className="text-sm text-muted-foreground">Cargando...</p>;
  if (error) return <p className="text-sm text-destructive">No se pudieron cargar los libros.</p>;
  if (!books || books.length === 0) {
    return <p className="text-sm text-muted-foreground">Todavía no hay libros en el catálogo.</p>;
  }

  // `useLoans` solo devuelve lo que el rol actual puede ver (docente/
  // estudiante/padre no ven todos los préstamos) — el conteo de
  // disponibilidad solo es exacto para quien gestiona la biblioteca.
  const activeLoansByBook = new Map<string, number>();
  for (const loan of loans ?? []) {
    if (!loan.returnedAt) {
      activeLoansByBook.set(loan.bookId, (activeLoansByBook.get(loan.bookId) ?? 0) + 1);
    }
  }

  return (
    <ul className="space-y-2">
      {books.map((book) => {
        const borrowed = activeLoansByBook.get(book.id) ?? 0;
        const available = book.totalCopies - borrowed;
        return (
          <Card key={book.id} className="flex items-center justify-between py-3">
            <div>
              <p className="font-medium">{book.title}</p>
              <p className="text-sm text-muted-foreground">{book.author}</p>
            </div>
            {canManage ? (
              <p className={`text-sm ${available > 0 ? 'text-muted-foreground' : 'text-destructive'}`}>
                {available} / {book.totalCopies} disponibles
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">{book.totalCopies} copia(s)</p>
            )}
          </Card>
        );
      })}
    </ul>
  );
}
