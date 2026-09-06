'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Enrollment, PaginatedResult, DistributeSectionsResultRow } from '@eduapp/shared-types';

export interface EnrollmentFilter {
  sectionId?: string;
  academicYearId?: string;
  studentId?: string;
  search?: string;
}

export interface PaginatedEnrollmentFilter extends EnrollmentFilter {
  page: number;
  pageSize: number;
}

async function fetchEnrollments(
  filter?: EnrollmentFilter | PaginatedEnrollmentFilter,
): Promise<Enrollment[] | PaginatedResult<Enrollment>> {
  const params = new URLSearchParams();
  if (filter?.studentId) params.set('studentId', filter.studentId);
  if (filter?.sectionId) params.set('sectionId', filter.sectionId);
  if (filter?.academicYearId) params.set('academicYearId', filter.academicYearId);
  if (filter?.search) params.set('search', filter.search);
  if (filter && 'page' in filter) params.set('page', String(filter.page));
  if (filter && 'pageSize' in filter) params.set('pageSize', String(filter.pageSize));
  const qs = params.toString();

  const res = await fetch(qs ? `/api/enrollments?${qs}` : '/api/enrollments');
  if (!res.ok) throw new Error('No se pudieron cargar las matrículas');
  return res.json();
}

export interface EnrollStudentInput {
  studentId: string;
  sectionId: string;
  academicYearId: string;
}

async function enrollStudent(input: EnrollStudentInput): Promise<Enrollment> {
  const res = await fetch('/api/enrollments', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.message ?? 'No se pudo matricular al estudiante');
  }
  return res.json();
}

export function useEnrollments(filter?: EnrollmentFilter): ReturnType<typeof useQuery<Enrollment[]>>;
export function useEnrollments(
  filter: PaginatedEnrollmentFilter,
): ReturnType<typeof useQuery<PaginatedResult<Enrollment>>>;
export function useEnrollments(filter?: EnrollmentFilter | PaginatedEnrollmentFilter) {
  return useQuery({
    queryKey: ['enrollments', filter ?? 'all'],
    queryFn: () => fetchEnrollments(filter),
    // Cada término de búsqueda/página distinto es una query-key nueva, así
    // que sin esto `isLoading` se prendería en cada tecla del buscador y
    // desmontaría todo el árbol (mismo bug ya visto y arreglado en Usuarios).
    placeholderData: keepPreviousData,
  });
}

export function useEnrollStudent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: enrollStudent,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['enrollments'] }),
  });
}

async function withdrawEnrollment(id: string): Promise<Enrollment> {
  const res = await fetch(`/api/enrollments/${id}/withdraw`, { method: 'PATCH' });
  if (!res.ok) throw new Error('No se pudo dar de baja la matrícula');
  return res.json();
}

async function completeEnrollment(id: string): Promise<Enrollment> {
  const res = await fetch(`/api/enrollments/${id}/complete`, { method: 'PATCH' });
  if (!res.ok) throw new Error('No se pudo completar la matrícula');
  return res.json();
}

export function useWithdrawEnrollment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: withdrawEnrollment,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['enrollments'] }),
  });
}

export function useCompleteEnrollment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: completeEnrollment,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['enrollments'] }),
  });
}

export interface ReassignEnrollmentSectionInput {
  id: string;
  sectionId: string;
}

async function reassignEnrollmentSection({
  id,
  sectionId,
}: ReassignEnrollmentSectionInput): Promise<Enrollment> {
  const res = await fetch(`/api/enrollments/${id}/reassign-section`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ sectionId }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.message ?? 'No se pudo reubicar la matrícula');
  }
  return res.json();
}

export function useReassignEnrollmentSection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: reassignEnrollmentSection,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['enrollments'] }),
  });
}

export interface DistributeGradeIntoSectionsInput {
  gradeId: string;
  academicYearId: string;
  sectionIds: string[];
}

async function distributeGradeIntoSections(
  input: DistributeGradeIntoSectionsInput,
): Promise<DistributeSectionsResultRow[]> {
  const { gradeId, ...body } = input;
  const res = await fetch(`/api/enrollments/grades/${gradeId}/distribute-sections`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const errBody = await res.json().catch(() => null);
    throw new Error(errBody?.message ?? 'No se pudo repartir el grado');
  }
  return res.json();
}

export function useDistributeGradeIntoSections() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: distributeGradeIntoSections,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['enrollments'] }),
  });
}
