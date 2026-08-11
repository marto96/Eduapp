'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Enrollment } from '@eduapp/shared-types';

export interface EnrollmentFilter {
  sectionId?: string;
  academicYearId?: string;
  studentId?: string;
}

async function fetchEnrollments(filter?: EnrollmentFilter): Promise<Enrollment[]> {
  const qs = filter ? new URLSearchParams(filter as Record<string, string>).toString() : '';
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
  if (!res.ok) throw new Error('No se pudo matricular al estudiante');
  return res.json();
}

export function useEnrollments(filter?: EnrollmentFilter) {
  return useQuery({
    queryKey: ['enrollments', filter ?? 'all'],
    queryFn: () => fetchEnrollments(filter),
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
