'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Enrollment } from '@eduapp/shared-types';

async function fetchEnrollments(): Promise<Enrollment[]> {
  const res = await fetch('/api/enrollments');
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

export function useEnrollments() {
  return useQuery({ queryKey: ['enrollments'], queryFn: fetchEnrollments });
}

export function useEnrollStudent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: enrollStudent,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['enrollments'] }),
  });
}
