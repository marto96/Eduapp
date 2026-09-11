'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { DeliveryMethod, DocumentRequest, DocumentRequestStatus, DocumentType, DocumentTypePrice } from '@eduapp/shared-types';
import { toQueryString } from '@/lib/utils';

async function fetchDocumentTypePrices(): Promise<DocumentTypePrice[]> {
  const res = await fetch('/api/documents/types/prices');
  if (!res.ok) throw new Error('No se pudieron cargar los precios');
  return res.json();
}

export function useDocumentTypePrices() {
  return useQuery({
    queryKey: ['document-type-prices'],
    queryFn: fetchDocumentTypePrices,
  });
}

async function fetchDocumentRequests(status?: DocumentRequestStatus): Promise<DocumentRequest[]> {
  const qs = status ? toQueryString({ status }) : '';
  const res = await fetch(qs ? `/api/documents/requests?${qs}` : '/api/documents/requests');
  if (!res.ok) throw new Error('No se pudieron cargar las solicitudes');
  return res.json();
}

export function useDocumentRequests(status?: DocumentRequestStatus) {
  return useQuery({
    queryKey: ['document-requests', status ?? 'all'],
    queryFn: () => fetchDocumentRequests(status),
  });
}

export interface RequestDocumentInput {
  enrollmentId: string;
  type: DocumentType;
  deliveryMethod: DeliveryMethod;
  note?: string;
}

async function requestDocument(input: RequestDocumentInput): Promise<DocumentRequest> {
  const res = await fetch('/api/documents/requests', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error('No se pudo crear la solicitud');
  return res.json();
}

export function useRequestDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: requestDocument,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['document-requests'] });
      toast.success('Solicitud enviada.');
    },
  });
}

async function rejectDocumentRequest({ id, reason }: { id: string; reason: string }): Promise<DocumentRequest> {
  const res = await fetch(`/api/documents/requests/${id}/reject`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ reason }),
  });
  if (!res.ok) throw new Error('No se pudo rechazar la solicitud');
  return res.json();
}

export function useRejectDocumentRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: rejectDocumentRequest,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['document-requests'] }),
  });
}

async function deliverDocumentRequest(id: string): Promise<DocumentRequest> {
  const res = await fetch(`/api/documents/requests/${id}/deliver`, { method: 'PATCH' });
  if (!res.ok) throw new Error('No se pudo marcar como entregada');
  return res.json();
}

export function useDeliverDocumentRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deliverDocumentRequest,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['document-requests'] }),
  });
}

async function setDocumentTypePrice({ type, amount }: { type: DocumentType; amount: number }): Promise<DocumentTypePrice> {
  const res = await fetch(`/api/documents/types/prices/${type}`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ amount }),
  });
  if (!res.ok) throw new Error('No se pudo actualizar el precio');
  return res.json();
}

export function useSetDocumentTypePrice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: setDocumentTypePrice,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['document-type-prices'] });
      toast.success('Precio actualizado.');
    },
  });
}
