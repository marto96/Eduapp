'use client';

import { FormEvent, useState } from 'react';
import { useCreateBook } from '../use-books';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function CreateBookForm() {
  const createBook = useCreateBook();
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [totalCopies, setTotalCopies] = useState('1');

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const copies = Number(totalCopies);
    if (!title.trim() || !author.trim() || !copies || copies < 1) return;
    createBook.mutate(
      { title, author, totalCopies: copies },
      {
        onSuccess: () => {
          setTitle('');
          setAuthor('');
          setTotalCopies('1');
        },
      },
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3">
      <div className="flex-1 space-y-1.5" style={{ minWidth: '14rem' }}>
        <Label htmlFor="title">Título</Label>
        <Input id="title" required value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>
      <div className="flex-1 space-y-1.5" style={{ minWidth: '12rem' }}>
        <Label htmlFor="author">Autor</Label>
        <Input id="author" required value={author} onChange={(e) => setAuthor(e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="totalCopies">Copias</Label>
        <Input
          id="totalCopies"
          type="number"
          min={1}
          className="w-24"
          value={totalCopies}
          onChange={(e) => setTotalCopies(e.target.value)}
        />
      </div>
      <Button type="submit" disabled={createBook.isPending}>
        {createBook.isPending ? 'Agregando...' : 'Agregar libro'}
      </Button>
      {createBook.isError && <p className="text-sm text-destructive">No se pudo agregar el libro.</p>}
    </form>
  );
}
