'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ContractType, Employee } from '@eduapp/shared-types';

export interface EmployeeFilter {
  userId?: string;
}

async function fetchEmployees(filter?: EmployeeFilter): Promise<Employee[]> {
  const qs = filter ? new URLSearchParams(filter as Record<string, string>).toString() : '';
  const res = await fetch(qs ? `/api/hr/employees?${qs}` : '/api/hr/employees');
  if (!res.ok) throw new Error('No se pudieron cargar los legajos');
  return res.json();
}

export interface CreateEmployeeInput {
  userId: string;
  position: string;
  contractType: ContractType;
  hireDate: string;
}

async function createEmployee(input: CreateEmployeeInput): Promise<Employee> {
  const res = await fetch('/api/hr/employees', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error('No se pudo crear el legajo');
  return res.json();
}

export function useEmployees(filter?: EmployeeFilter) {
  return useQuery({
    queryKey: ['employees', filter ?? 'all'],
    queryFn: () => fetchEmployees(filter),
  });
}

export function useCreateEmployee() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createEmployee,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['employees'] }),
  });
}
