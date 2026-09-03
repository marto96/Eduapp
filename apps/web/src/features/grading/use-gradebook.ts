'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  GradebookStudentRow,
  GradebookResponse,
  SubjectPeriodDetailResponse,
  CreateGradeInput,
  GradeScore,
  PaginatedResult,
} from '@eduapp/shared-types';
import { toQueryString } from '@/lib/utils';

export interface SearchGradebookStudentsFilter {
  academicYearId: string;
  search?: string;
  page: number;
  pageSize: number;
}

async function searchGradebookStudents(
  filter: SearchGradebookStudentsFilter,
): Promise<PaginatedResult<GradebookStudentRow>> {
  const qs = toQueryString(filter);
  const res = await fetch(`/api/grading/gradebook/students?${qs}`);
  if (!res.ok) throw new Error('No se pudieron buscar estudiantes');
  return res.json();
}

export function useGradebookStudents(filter: SearchGradebookStudentsFilter, enabled: boolean) {
  return useQuery({
    queryKey: ['gradebook-students', filter],
    queryFn: () => searchGradebookStudents(filter),
    enabled,
  });
}

async function fetchGradebook(enrollmentId: string): Promise<GradebookResponse> {
  const res = await fetch(`/api/grading/gradebook/${enrollmentId}`);
  if (!res.ok) throw new Error('No se pudo cargar el boletín');
  return res.json();
}

export function useGradebook(enrollmentId: string | null) {
  return useQuery({
    queryKey: ['gradebook', enrollmentId],
    queryFn: () => fetchGradebook(enrollmentId!),
    enabled: enrollmentId !== null,
  });
}

async function fetchSubjectPeriodDetail(
  enrollmentId: string,
  subjectId: string,
  periodId: string,
): Promise<SubjectPeriodDetailResponse> {
  const qs = toQueryString({ subjectId, periodId });
  const res = await fetch(`/api/grading/gradebook/${enrollmentId}/subject-period?${qs}`);
  if (!res.ok) throw new Error('No se pudo cargar el detalle de la nota');
  return res.json();
}

export function useSubjectPeriodDetail(
  enrollmentId: string | null,
  subjectId: string | null,
  periodId: string | null,
) {
  return useQuery({
    queryKey: ['gradebook-subject-period', enrollmentId, subjectId, periodId],
    queryFn: () => fetchSubjectPeriodDetail(enrollmentId!, subjectId!, periodId!),
    enabled: enrollmentId !== null && subjectId !== null && periodId !== null,
  });
}

export interface CreateGradeMutationInput extends CreateGradeInput {
  enrollmentId: string;
}

async function createGrade({ enrollmentId, ...input }: CreateGradeMutationInput): Promise<GradeScore> {
  const res = await fetch(`/api/grading/gradebook/${enrollmentId}/grades`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.message ?? 'No se pudo guardar la nota');
  }
  return res.json();
}

export function useCreateGrade() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createGrade,
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['gradebook', variables.enrollmentId] });
      queryClient.invalidateQueries({ queryKey: ['gradebook-subject-period', variables.enrollmentId] });
    },
  });
}
