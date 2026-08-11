'use client';

import Link from 'next/link';
import { useLoans } from '@/features/library/use-loans';
import { useBooks } from '@/features/library/use-books';
import { Card } from '@/components/ui/card';

export function MyLoansWidget() {
  const { data: loans, isLoading } = useLoans();
  const { data: books } = useBooks();

  const active = (loans ?? []).filter((l) => !l.returnedAt);
  const bookTitleById = new Map(books?.map((b) => [b.id, b.title]));

  return (
    <Link href="/library" className="block">
      <Card className="transition-colors hover:border-primary">
        <p className="text-[10px] uppercase tracking-wide text-primary">Préstamos activos</p>
        {isLoading && <p className="mt-2 text-sm text-muted-foreground">Cargando...</p>}
        {!isLoading && active.length === 0 && (
          <p className="mt-2 text-sm text-muted-foreground">Sin préstamos activos.</p>
        )}
        <ul className="mt-2 space-y-1">
          {active.map((loan) => (
            <li key={loan.id} className="flex items-center justify-between gap-3 text-sm">
              <span className="truncate">{bookTitleById.get(loan.bookId) ?? loan.bookId}</span>
              <span className="shrink-0 text-xs text-muted-foreground">vence {loan.dueDate}</span>
            </li>
          ))}
        </ul>
      </Card>
    </Link>
  );
}
