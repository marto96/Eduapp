'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { DocumentType, IssuedDocument, PaginatedResult } from '@eduapp/shared-types';
import { toQueryString } from '@/lib/utils';

export interface DocumentFilter {
  enrollmentId?: string;
  type?: DocumentType;
  search?: string;
}

export interface PaginatedDocumentFilter extends DocumentFilter {
  page: number;
  pageSize: number;
}

async function fetchDocuments(
  filter?: DocumentFilter | PaginatedDocumentFilter,
): Promise<IssuedDocument[] | PaginatedResult<IssuedDocument>> {
  const qs = filter ? toQueryString(filter) : '';
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

export function useDocuments(filter?: DocumentFilter): ReturnType<typeof useQuery<IssuedDocument[]>>;
export function useDocuments(
  filter: PaginatedDocumentFilter,
): ReturnType<typeof useQuery<PaginatedResult<IssuedDocument>>>;
export function useDocuments(filter?: DocumentFilter | PaginatedDocumentFilter) {
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
