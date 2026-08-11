'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Loan } from '@eduapp/shared-types';

async function fetchLoans(): Promise<Loan[]> {
  const res = await fetch('/api/library/loans');
  if (!res.ok) throw new Error('No se pudieron cargar los préstamos');
  return res.json();
}

export interface CreateLoanInput {
  bookId: string;
  studentId: string;
  dueDate: string;
}

async function createLoan(input: CreateLoanInput): Promise<Loan> {
  const res = await fetch('/api/library/loans', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error('No se pudo registrar el préstamo');
  return res.json();
}

async function returnLoan(id: string): Promise<Loan> {
  const res = await fetch(`/api/library/loans/${id}/return`, { method: 'PATCH' });
  if (!res.ok) throw new Error('No se pudo registrar la devolución');
  return res.json();
}

export function useLoans() {
  return useQuery({ queryKey: ['loans'], queryFn: fetchLoans });
}

export function useCreateLoan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createLoan,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['loans'] }),
  });
}

export function useReturnLoan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: returnLoan,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['loans'] }),
  });
}
