'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { DocumentType, IssuedDocument } from '@eduapp/shared-types';

export interface DocumentFilter {
  enrollmentId?: string;
  type?: DocumentType;
}

async function fetchDocuments(filter?: DocumentFilter): Promise<IssuedDocument[]> {
  const qs = filter ? new URLSearchParams(filter as Record<string, string>).toString() : '';
  const res = await fetch(qs ? `/api/documents?${qs}` : '/api/documents');
  if (!res.ok) throw new Error('No se pudieron cargar los documentos');
  return res.json();
}

export interface IssueDocumentInput {
  enrollmentId: string;
  type: DocumentType;
  description: string;
  issuedAt: string;
}

async function issueDocument(input: IssueDocumentInput): Promise<IssuedDocument> {
  const res = await fetch('/api/documents', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error('No se pudo emitir el documento');
  return res.json();
}

export function useDocuments(filter?: DocumentFilter) {
  return useQuery({
    queryKey: ['documents', filter ?? 'all'],
    queryFn: () => fetchDocuments(filter),
  });
}

export function useIssueDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: issueDocument,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      toast.success('Documento emitido.');
    },
  });
}

async function voidDocument(id: string): Promise<IssuedDocument> {
  const res = await fetch(`/api/documents/${id}/void`, { method: 'PATCH' });
  if (!res.ok) throw new Error('No se pudo anular el documento');
  return res.json();
}

export function useVoidDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: voidDocument,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['documents'] }),
  });
}
