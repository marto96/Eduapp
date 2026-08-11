'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Book } from '@eduapp/shared-types';

async function fetchBooks(): Promise<Book[]> {
  const res = await fetch('/api/library/books');
  if (!res.ok) throw new Error('No se pudieron cargar los libros');
  return res.json();
}

export interface CreateBookInput {
  title: string;
  author: string;
  totalCopies: number;
}

async function createBook(input: CreateBookInput): Promise<Book> {
  const res = await fetch('/api/library/books', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error('No se pudo crear el libro');
  return res.json();
}

export function useBooks() {
  return useQuery({ queryKey: ['books'], queryFn: fetchBooks });
}

export function useCreateBook() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createBook,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['books'] }),
  });
}
