'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { BankTransaction, Payment } from '@eduapp/shared-types';

async function fetchBankTransactions(): Promise<BankTransaction[]> {
  const res = await fetch('/api/finance/bank-transactions');
  if (!res.ok) throw new Error('No se pudieron cargar las transacciones');
  return res.json();
}

async function fetchAllPayments(): Promise<Payment[]> {
  const res = await fetch('/api/finance/payments');
  if (!res.ok) throw new Error('No se pudieron cargar los pagos');
  return res.json();
}

async function importBankTransactions(file: File): Promise<BankTransaction[]> {
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch('/api/finance/bank-transactions/import', { method: 'POST', body: formData });
  if (!res.ok) throw new Error('No se pudo importar el archivo');
  return res.json();
}

export interface MatchBankTransactionInput {
  id: string;
  paymentId: string;
}

async function matchBankTransaction({ id, paymentId }: MatchBankTransactionInput): Promise<BankTransaction> {
  const res = await fetch(`/api/finance/bank-transactions/${id}/match`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ paymentId }),
  });
  if (!res.ok) throw new Error('No se pudo conciliar la transacción');
  return res.json();
}

export function useBankTransactions() {
  return useQuery({ queryKey: ['bank-transactions'], queryFn: fetchBankTransactions });
}

export function useAllPayments() {
  return useQuery({ queryKey: ['payments', 'all'], queryFn: fetchAllPayments });
}

export function useImportBankTransactions() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: importBankTransactions,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['bank-transactions'] }),
  });
}

export function useMatchBankTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: matchBankTransaction,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['bank-transactions'] }),
  });
}
