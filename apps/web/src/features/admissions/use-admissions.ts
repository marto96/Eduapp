'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  AdmissionAcceptResponse,
  AdmissionApplication,
  AdmissionStatus,
  AdmissionStatusResponse,
  IdentityDocumentType,
  PaginatedResult,
} from '@eduapp/shared-types';

export interface CreateAdmissionApplicationInput {
  studentFirstName: string;
  studentLastName: string;
  studentBirthDate: string;
  studentDocumentType: IdentityDocumentType;
  studentDocumentNumber: string;
  studentAddress: string;
  gradeId: string;
  academicYearId: string;
  guardianName: string;
  guardianEmail: string;
  guardianPhone: string;
}

export interface CreateAdmissionApplicationResult {
  trackingCode: string;
  checkoutUrl: string;
}

async function createAdmissionApplication(
  input: CreateAdmissionApplicationInput,
): Promise<CreateAdmissionApplicationResult> {
  const res = await fetch('/api/admissions/applications', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.message ?? 'No se pudo enviar la solicitud');
  }
  return res.json();
}

export function useCreateAdmissionApplication() {
  return useMutation({ mutationFn: createAdmissionApplication });
}

async function fetchAdmissionStatus(trackingCode: string): Promise<AdmissionStatusResponse> {
  const res = await fetch(`/api/admissions/applications/status/${encodeURIComponent(trackingCode)}`);
  if (!res.ok) throw new Error('No se encontró una solicitud con ese código');
  return res.json();
}

export function useAdmissionStatus(trackingCode: string) {
  return useQuery({
    queryKey: ['admission-status', trackingCode],
    queryFn: () => fetchAdmissionStatus(trackingCode),
    enabled: trackingCode.trim().length > 0,
    retry: false,
  });
}

export interface AdmissionApplicationsQuery {
  status?: AdmissionStatus;
  page?: number;
  pageSize?: number;
  search?: string;
}

async function fetchAdmissionApplications(
  query: AdmissionApplicationsQuery,
): Promise<PaginatedResult<AdmissionApplication>> {
  const params = new URLSearchParams();
  if (query.status) params.set('status', query.status);
  if (query.page) params.set('page', String(query.page));
  if (query.pageSize) params.set('pageSize', String(query.pageSize));
  if (query.search) params.set('search', query.search);
  const qs = params.toString();

  const res = await fetch(`/api/admissions/management${qs ? `?${qs}` : ''}`);
  if (!res.ok) throw new Error('No se pudieron cargar las solicitudes');
  return res.json();
}

export function useAdmissionApplications(query: AdmissionApplicationsQuery = {}) {
  return useQuery({
    queryKey: ['admission-applications', query],
    queryFn: () => fetchAdmissionApplications(query),
  });
}

export interface RecordAdmissionInterviewInput {
  id: string;
  interviewDate: string;
  interviewNotes?: string;
}

async function recordAdmissionInterview({
  id,
  ...body
}: RecordAdmissionInterviewInput): Promise<AdmissionApplication> {
  const res = await fetch(`/api/admissions/management/${id}/interview`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const body2 = await res.json().catch(() => null);
    throw new Error(body2?.message ?? 'No se pudo registrar la entrevista');
  }
  return res.json();
}

export function useRecordAdmissionInterview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: recordAdmissionInterview,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admission-applications'] }),
  });
}

async function acceptAdmissionApplication(id: string): Promise<AdmissionAcceptResponse> {
  const res = await fetch(`/api/admissions/management/${id}/accept`, { method: 'PATCH' });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.message ?? 'No se pudo aceptar la solicitud');
  }
  return res.json();
}

export function useAcceptAdmissionApplication() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: acceptAdmissionApplication,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admission-applications'] }),
  });
}

async function rejectAdmissionApplication({
  id,
  rejectionReason,
}: {
  id: string;
  rejectionReason: string;
}): Promise<AdmissionApplication> {
  const res = await fetch(`/api/admissions/management/${id}/reject`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ rejectionReason }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.message ?? 'No se pudo rechazar la solicitud');
  }
  return res.json();
}

export function useRejectAdmissionApplication() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: rejectAdmissionApplication,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admission-applications'] }),
  });
}

async function linkAdmissionEnrollment({
  id,
  enrollmentId,
}: {
  id: string;
  enrollmentId: string;
}): Promise<AdmissionApplication> {
  const res = await fetch(`/api/admissions/management/${id}/link-enrollment`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ enrollmentId }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.message ?? 'No se pudo enlazar la matrícula');
  }
  return res.json();
}

export function useLinkAdmissionEnrollment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: linkAdmissionEnrollment,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admission-applications'] }),
  });
}
