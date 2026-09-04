'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { PaginatedResult, TenantUser } from '@eduapp/shared-types';

export interface UsersFilter {
  role?: string;
  search?: string;
}

export interface PaginatedUsersFilter extends UsersFilter {
  page: number;
  pageSize: number;
}

async function fetchUsers(
  filter: UsersFilter | PaginatedUsersFilter,
): Promise<TenantUser[] | PaginatedResult<TenantUser>> {
  const params = new URLSearchParams();
  if (filter.role) params.set('role', filter.role);
  if (filter.search) params.set('search', filter.search);
  if ('page' in filter) params.set('page', String(filter.page));
  if ('pageSize' in filter) params.set('pageSize', String(filter.pageSize));
  const qs = params.toString();

  const res = await fetch(`/api/users${qs ? `?${qs}` : ''}`);
  if (!res.ok) throw new Error('No se pudieron cargar los usuarios');
  return res.json();
}

export type DocumentType = 'RC' | 'TI' | 'CC' | 'CE' | 'PA';

export interface CreateUserInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  roles: string[];
  birthDate?: string;
  documentType?: DocumentType;
  documentNumber?: string;
  address?: string;
}

async function createUser(input: CreateUserInput): Promise<TenantUser> {
  const res = await fetch('/api/users', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.message ?? 'No se pudo crear el usuario');
  }
  return res.json();
}

export function useUsers(role?: string): ReturnType<typeof useQuery<TenantUser[]>>;
export function useUsers(filter: UsersFilter): ReturnType<typeof useQuery<TenantUser[]>>;
export function useUsers(
  filter: PaginatedUsersFilter,
): ReturnType<typeof useQuery<PaginatedResult<TenantUser>>>;
export function useUsers(arg?: string | UsersFilter | PaginatedUsersFilter) {
  const filter: UsersFilter | PaginatedUsersFilter = typeof arg === 'string' ? { role: arg } : (arg ?? {});
  return useQuery({ queryKey: ['users', filter], queryFn: () => fetchUsers(filter) });
}

export function useCreateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createUser,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
  });
}

async function resetUserPassword(id: string): Promise<{ temporaryPassword: string }> {
  const res = await fetch(`/api/users/${id}/reset-password`, { method: 'PATCH' });
  if (!res.ok) throw new Error('No se pudo resetear la contraseña');
  return res.json();
}

export function useResetUserPassword() {
  return useMutation({ mutationFn: resetUserPassword });
}
