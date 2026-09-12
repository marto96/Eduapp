'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  AdmissionAcceptResponse,
  AdmissionApplication,
  AdmissionDocument,
  AdmissionDocumentType,
  AdmissionStatus,
  AdmissionStatusResponse,
  GradeAdmissionAvailability,
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

async function fetchAdmissionDocuments(trackingCode: string): Promise<AdmissionDocument[]> {
  const res = await fetch(`/api/admissions/applications/status/${encodeURIComponent(trackingCode)}/documents`);
  if (!res.ok) throw new Error('No se pudieron cargar los documentos');
  return res.json();
}

/** Público, por tracking code — la misma credencial que usa la consulta de estado. */
export function useAdmissionDocuments(trackingCode: string) {
  return useQuery({
    queryKey: ['admission-documents', trackingCode],
    queryFn: () => fetchAdmissionDocuments(trackingCode),
    enabled: trackingCode.trim().length > 0,
    retry: false,
  });
}

async function uploadAdmissionDocument({
  trackingCode,
  type,
  file,
}: {
  trackingCode: string;
  type: AdmissionDocumentType;
  file: File;
}): Promise<AdmissionDocument> {
  const formData = new FormData();
  formData.set('type', type);
  formData.set('file', file);
  const res = await fetch(`/api/admissions/applications/status/${encodeURIComponent(trackingCode)}/documents`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.message ?? 'No se pudo subir el archivo');
  }
  return res.json();
}

export function useUploadAdmissionDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: uploadAdmissionDocument,
    onSuccess: (_data, variables) =>
      queryClient.invalidateQueries({ queryKey: ['admission-documents', variables.trackingCode] }),
  });
}

async function fetchAdmissionDocumentsForReview(applicationId: string): Promise<AdmissionDocument[]> {
  const res = await fetch(`/api/admissions/management/${applicationId}/documents`);
  if (!res.ok) throw new Error('No se pudieron cargar los documentos');
  return res.json();
}

/** Staff, por id de solicitud directo (viene de la lista de gestión). */
export function useAdmissionDocumentsForReview(applicationId: string) {
  return useQuery({
    queryKey: ['admission-documents-review', applicationId],
    queryFn: () => fetchAdmissionDocumentsForReview(applicationId),
    enabled: applicationId.trim().length > 0,
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

async function fetchGradeAdmissionAvailability(
  academicYearId: string,
): Promise<GradeAdmissionAvailability[]> {
  const res = await fetch(
    `/api/admissions/management/grade-availability?academicYearId=${encodeURIComponent(academicYearId)}`,
  );
  if (!res.ok) throw new Error('No se pudo cargar la disponibilidad de cupos');
  return res.json();
}

export function useGradeAdmissionAvailability(academicYearId: string) {
  return useQuery({
    queryKey: ['grade-admission-availability', academicYearId],
    queryFn: () => fetchGradeAdmissionAvailability(academicYearId),
    enabled: academicYearId.trim().length > 0,
  });
}

async function setAdmissionGradeClosed({
  gradeId,
  academicYearId,
  closed,
}: {
  gradeId: string;
  academicYearId: string;
  closed: boolean;
}): Promise<void> {
  const res = await fetch(`/api/admissions/management/grade-availability/${gradeId}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ academicYearId, closed }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.message ?? 'No se pudo actualizar el cupo de ese grado');
  }
}

export function useSetAdmissionGradeClosed() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: setAdmissionGradeClosed,
    onSuccess: (_data, variables) =>
      queryClient.invalidateQueries({
        queryKey: ['grade-admission-availability', variables.academicYearId],
      }),
  });
}
