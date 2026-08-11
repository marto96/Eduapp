'use client';

import { FormEvent, useState } from 'react';
import { useCreateLoan } from '../use-loans';
import { useBooks } from '../use-books';
import { useUsers } from '@/features/users/use-users';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function CreateLoanForm() {
  const createLoan = useCreateLoan();
  const { data: books } = useBooks();
  const { data: students } = useUsers('estudiante');
  const [bookId, setBookId] = useState('');
  const [studentId, setStudentId] = useState('');
  const [dueDate, setDueDate] = useState('');

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!bookId || !studentId || !dueDate) return;
    createLoan.mutate(
      { bookId, studentId, dueDate },
      {
        onSuccess: () => {
          setBookId('');
          setStudentId('');
          setDueDate('');
        },
      },
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3">
      <div className="space-y-1.5">
        <Label htmlFor="bookId">Libro</Label>
        <select
          id="bookId"
          required
          value={bookId}
          onChange={(e) => setBookId(e.target.value)}
          className="flex h-10 w-56 rounded border border-border bg-background px-3 text-sm outline-none focus:border-primary"
        >
          <option value="">Elegir libro...</option>
          {books?.map((b) => (
            <option key={b.id} value={b.id}>
              {b.title}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="studentId">Estudiante</Label>
        <select
          id="studentId"
          required
          value={studentId}
          onChange={(e) => setStudentId(e.target.value)}
          className="flex h-10 w-56 rounded border border-border bg-background px-3 text-sm outline-none focus:border-primary"
        >
          <option value="">Elegir estudiante...</option>
          {students?.map((s) => (
            <option key={s.id} value={s.id}>
              {s.fullName}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="dueDate">Vencimiento</Label>
        <Input
          id="dueDate"
          type="date"
          required
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
        />
      </div>
      <Button type="submit" disabled={createLoan.isPending}>
        {createLoan.isPending ? 'Prestando...' : 'Prestar libro'}
      </Button>
      {createLoan.isError && (
        <p className="text-sm text-destructive">No se pudo registrar el préstamo.</p>
      )}
    </form>
  );
}
